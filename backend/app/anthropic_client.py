"""Único provedor de IA do backend (decisão da seção 1 do ANALISE-MIGRACAO.md):
/extrair-formulario migra de Workers AI (Llama) pra Claude; /analisar-drive já
era Claude Haiku e mantém. /analisar-midia (Gemini) foi eliminado, não porta."""

from __future__ import annotations

import json

from anthropic import AsyncAnthropic

from .config import settings

_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

MODEL = "claude-haiku-4-5-20251001"


def _extract_json_block(text: str) -> dict:
    ini, fim = text.find("{"), text.rfind("}")
    if ini < 0 or fim <= ini:
        return {}
    try:
        return json.loads(text[ini : fim + 1])
    except json.JSONDecodeError:
        return {}


async def extrair_formulario(transcript: str, perguntas: list[dict]) -> dict:
    """Porte de /extrair-formulario: antes Llama via Workers AI, agora Claude.
    Prompt e regras de limpeza da resposta mantidos idênticos ao worker.js."""
    lista_perguntas = "\n".join(f"- {p['id']}: {p['label']}" for p in perguntas)

    system = """Você é um assistente da WeCare Hosting que extrai informações de transcrições de reuniões com proprietários de imóveis para aluguel por temporada.
Sua tarefa: ler a transcrição e preencher um formulário sobre o imóvel.
Regras:
- Responda APENAS com um objeto JSON válido, sem texto antes ou depois.
- As chaves do JSON são EXATAMENTE os ids das perguntas fornecidas (ex: "q1", "q25").
- O valor é a resposta extraída da transcrição, em português, de forma objetiva.
- Se a informação NÃO foi mencionada na reunião, use string vazia "".
- NÃO invente informações que não estão na transcrição.
- Para perguntas numéricas, retorne só o número como texto."""

    user = (
        f"PERGUNTAS DO FORMULÁRIO (id: pergunta):\n{lista_perguntas}\n\n"
        f"=== TRANSCRIÇÃO DA REUNIÃO ===\n{transcript}\n\n=== FIM DA TRANSCRIÇÃO ===\n\n"
        "Retorne o JSON com as respostas extraídas."
    )

    resp = await _client.messages.create(
        model=MODEL,
        max_tokens=4096,
        temperature=0.1,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    texto = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text")
    answers = _extract_json_block(texto)

    valid_ids = {p["id"] for p in perguntas}
    limpo = {
        k: str(v).strip()
        for k, v in answers.items()
        if k in valid_ids and v is not None and str(v).strip()
    }
    return {"answers": limpo, "encontrados": len(limpo)}


SYSTEM_ANALISAR_DRIVE = """Você é um assistente especializado em imóveis para aluguel por temporada da WeCare Hosting.
Analise os documentos e imagens fornecidos (pasta do Google Drive do imóvel) e extraia as informações do imóvel.
Responda APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois.
Estrutura esperada:
{"quartos":0,"salas":0,"banheirosCompletos":0,"banheirosLavabo":0,"cozinha":0,"lavanderia":0,"areaExterna":0,"varanda":0,"camas":[{"tipo":"Queen","qtd":1}],"proprietarioNome":"","proprietarioTel":"","proprietarioEmail":"","endereco":"","wifi_rede":"","wifi_senha":"","acesso":"","senha_porta":"","vaga":"","zelador_nome":"","zelador_tel":"","observacoes":"","short_stay_permitido":"","restricoes":"","comissao_pct":0,"comissao_base":"","valor_setup_cobrado":0,"fonte_valor_setup_cobrado":"","definicoes":{"seguroEasyCover":false,"kitAmenities":false,"internetClaro":false,"ecohost":false,"fechaduraEletronica":false},"formRascunho":{"q9":"","q81":"","q82":"","q83":"","q86":""}}
Regras:
- Use 0, "" ou false para campos não encontrados. NÃO invente informações.
- PRIORIDADE DE FONTE para qualquer dado comercial/financeiro (comissão, taxa de setup, seguro, taxas, pagadoria): o CONTRATO ASSINADO é a ÚNICA fonte válida. Documentos do tipo proposta, minuta, orçamento, e-mail de negociação ou apresentação comercial são preliminares e podem estar desatualizados — NUNCA use um valor desses documentos se houver um contrato assinado na pasta, mesmo que o contrato seja mais difícil de ler. Se houver contrato assinado mas você não encontrar o valor dentro dele, deixe o campo em branco (0/"") em vez de usar o valor de uma proposta.
- Tipos de cama aceitos: Solteiro, Casal, Queen, King, Beliche, Sofá-cama Solteiro, Sofá-cama Casal.
- endereco / q9: monte o endereço MAIS COMPLETO possível (rua, número, complemento/apto, bairro, cidade, estado, CEP) do imóvel indicado pelo nome informado no contexto. Se a pasta contiver documentos de um portfólio com VÁRIOS imóveis do mesmo proprietário, use APENAS o endereço que corresponda claramente a este imóvel específico — se não for possível identificar com segurança qual endereço é deste imóvel, deixe em branco em vez de arriscar um endereço de outra unidade.
- proprietarioEmail: e-mail do proprietário ou de quem assinou o contrato em nome dele (procure em contratos, assinaturas, cabeçalhos de e-mail, cartão de visita).
- q81: como hóspedes acessam (portaria, fechadura, etc.) + senha da porta + vaga
- q82: em qual andar ficam as áreas de lazer do condomínio (piscina, academia, salão de festas, espaço gourmet, etc.), se mencionado nos documentos
- q83: nome e telefone do zelador/portaria
- q86: rede e senha do Wi-Fi
- short_stay_permitido: "sim" se a convenção do condomínio permite aluguel por temporada/short stay, "nao" se proibido, "" se não mencionado
- comissao_pct / comissao_base: percentual de comissão da WeCare e sua base de cálculo, EXATAMENTE como estiver no contrato. comissao_base = "bruta" se o contrato disser "receita bruta" ou "faturamento bruto"; "liquida" se disser "receita líquida" (após taxas de plataforma/impostos). Leia com atenção — não assuma, use a palavra literal do contrato.
- valor_setup_cobrado: valor em reais da taxa de setup/start-up cobrada do proprietário (é um valor único de implantação, não a comissão recorrente mensal). Confira o número com atenção antes de responder — não arredonde nem aproxime.
- fonte_valor_setup_cobrado: copie e cole a frase EXATA (verbatim) do documento onde você leu o valor de valor_setup_cobrado, incluindo o nome do arquivo se identificável.
- definicoes: são serviços/produtos contratados da WeCare mencionados nos documentos (ex: "seguro EasyCover obrigatório" → seguroEasyCover:true; fechadura eletrônica instalada → fechaduraEletronica:true). NÃO são restrições.
- restricoes: SOMENTE limitações de uso do imóvel que não têm campo próprio no onboarding — proibição de animais, de festas, número máximo de hóspedes, cláusulas restritivas do condomínio/contrato. NUNCA inclua aqui seguro, kit amenities, internet, fechadura eletrônica, comissão, taxa de setup ou pagadoria — isso são produtos/condições comerciais, não restrições, e já têm campo próprio."""


async def analisar_drive(user_content: list[dict]) -> dict:
    resp = await _client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_ANALISAR_DRIVE,
        messages=[{"role": "user", "content": user_content}],
    )
    texto = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text")
    return _extract_json_block(texto)
