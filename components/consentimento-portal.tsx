'use client';

import React, { useState } from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import { atualizarAlunos } from '@/lib/alunos';
import { Button, Input, Label, Select } from '@/components/ui';
import {
  AVISO, AVISO_SAUDE, CONTROLADOR, VERSAO_AVISO, VINCULOS,
} from '@/lib/aviso-privacidade';

/* ============================================================
   Aceite do aviso de privacidade, no primeiro acesso do portal.

   Por que esta tela existe: tratar dado de criança exige
   consentimento específico e em destaque de pelo menos um dos pais
   ou do responsável legal (LGPD Art. 14, §1º) — e o ônus de PROVAR
   que foi obtido é de quem trata. Havia 429 matrículas sem prova
   nenhuma. Aqui a prova nasce no primeiro acesso de cada família,
   sem mutirão de papel.

   Duas decisões que não são estéticas:

   1. O aceite do aviso é OBRIGATÓRIO para seguir, porque o portal
      não tem como existir sem tratar a ficha que ele mostra. Mas o
      consentimento do DADO DE SAÚDE é uma caixa separada e
      OPCIONAL: o Art. 11 pede consentimento específico, e o
      Art. 14, §3º proíbe condicionar o serviço a entregar dado além
      do necessário. O portal funciona igual sem ele.

   2. Grava-se QUEM aceitou e com que vínculo, não só "aceitou".
      Um registro que não diz quem assinou não prova o Art. 14, §1º,
      que fala de pai, mãe ou responsável legal — não de "alguém com
      a senha".
   ============================================================ */

interface Props {
  /** Todos os filhos daquele telefone: o aceite vale para a família. */
  filhos: { id: string; name: string }[];
  /** Chamado quando o registro gravou, para o portal seguir. */
  aoAceitar: () => void;
}

export function ConsentimentoPortal({ filhos, aoAceitar }: Props) {
  const [nome, setNome] = useState('');
  const [vinculo, setVinculo] = useState<string>(VINCULOS[0]);
  const [aceitaSaude, setAceitaSaude] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const nomeOk = nome.trim().length >= 3;

  const confirmar = async () => {
    if (!nomeOk) {
      setErro('Escreva seu nome completo.');
      return;
    }
    setSalvando(true);
    setErro('');

    try {
      // Os ids vão no corpo, mas quem decide se o responsável PODE escrever
      // neles é o servidor, cruzando com o telefone do cookie assinado —
      // senão bastaria mandar o id de outra família.
      await atualizarAlunos(filhos.map(f => f.id), {
        consentimento_em: new Date().toISOString(),
        consentimento_por: `${nome.trim()} (${vinculo})`,
        consentimento_versao: VERSAO_AVISO,
        consentimento_saude: aceitaSaude,
      });
    } catch {
      setSalvando(false);
      setErro('Não conseguimos registrar agora. Tente de novo em instantes.');
      return;
    }

    setSalvando(false);
    aoAceitar();
  };

  const primeirosNomes = filhos.map(f => f.name.split(' ')[0]).join(' e ');

  return (
    <div className="fixed inset-0 z-50 bg-canvas overflow-y-auto">
      <div className="mx-auto w-full max-w-lg px-4 py-8 pb-16">

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-surface-raised rounded-2xl shrink-0">
            <ShieldCheck className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-ink leading-tight">Antes de continuar</h1>
            <p className="text-sm text-ink-muted">Como cuidamos dos dados de {primeirosNomes}</p>
          </div>
        </div>

        <div className="space-y-4">
          {AVISO.map(bloco => (
            <section key={bloco.titulo} className="bg-surface rounded-card border border-line p-4">
              <h2 className="text-sm font-extrabold text-ink mb-2.5">{bloco.titulo}</h2>
              <ul className="space-y-1.5">
                {bloco.itens.map(item => (
                  <li key={item} className="flex gap-2 text-sm text-ink-muted leading-snug">
                    <span className="text-brand font-black shrink-0">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Caixa separada: consentimento específico do dado de saúde (Art. 11). */}
        <button
          type="button"
          onClick={() => setAceitaSaude(v => !v)}
          className="w-full text-left mt-4 bg-brand-soft border border-brand-line rounded-card p-4 active:scale-[0.99] transition-transform"
        >
          <div className="flex gap-3">
            <span
              className={
                'mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center ' +
                (aceitaSaude ? 'bg-surface-raised border-surface-raised' : 'bg-surface border-line')
              }
            >
              {aceitaSaude && <Check className="w-3.5 h-3.5 text-brand" strokeWidth={3} />}
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-ink mb-1">{AVISO_SAUDE.titulo}</h2>
              <p className="text-sm text-ink-muted leading-snug">{AVISO_SAUDE.texto}</p>
            </div>
          </div>
        </button>

        <div className="mt-6 bg-surface rounded-card border border-line p-4 space-y-3">
          <div>
            <Label>Seu nome completo</Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Como está no documento"
              autoComplete="name"
            />
          </div>
          <div>
            <Label>Você é</Label>
            <Select value={vinculo} onChange={e => setVinculo(e.target.value)}>
              {VINCULOS.map(v => <option key={v} value={v}>{v}</option>)}
            </Select>
          </div>
        </div>

        {erro && <p className="mt-3 text-sm font-bold text-danger-ink">{erro}</p>}

        <Button
          variant="primary"
          size="lg"
          block
          className="mt-5"
          disabled={!nomeOk || salvando}
          onClick={confirmar}
        >
          {salvando ? 'Registrando...' : 'Li e concordo'}
        </Button>

        <p className="mt-4 text-xs text-ink-muted leading-relaxed text-center">
          Você pode retirar este consentimento depois, a qualquer momento, falando com a
          recepção. Responsável pelos dados: {CONTROLADOR.nome}
          {CONTROLADOR.cnpj ? ` · CNPJ ${CONTROLADOR.cnpj}` : ''}
          {CONTROLADOR.contato ? ` · ${CONTROLADOR.contato}` : ''}.
        </p>
      </div>
    </div>
  );
}
