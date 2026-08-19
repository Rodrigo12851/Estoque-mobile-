import React, { useState } from 'react';
import { TermoConcordanciaRegistro } from '../types';

interface TermoConcordanciaModalProps {
  visivel: boolean;
  onAceitar: () => void;
  usuarioNome: string;
  perfilNome: string;
  lojaNome?: string;
  apenasLeitura?: boolean;
  onFechar?: () => void;
}

export const TermoConcordanciaModal: React.FC<TermoConcordanciaModalProps> = ({
  visivel,
  onAceitar,
  usuarioNome,
  perfilNome,
  lojaNome,
  apenasLeitura = false,
  onFechar,
}) => {
  const [concordo, setConcordo] = useState<boolean>(false);
  const [leuAteFim, setLeuAteFim] = useState<boolean>(false);

  if (!visivel) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setLeuAteFim(true);
    }
  };

  const handleConfirmar = () => {
    if (!concordo && !apenasLeitura) {
      alert('Para prosseguir, você deve marcar a caixa confirmando que leu e concorda com os termos de uso e segurança.');
      return;
    }
    onAceitar();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '680px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* CABEÇALHO */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '20px 24px',
            color: '#ffffff',
            borderBottom: '3px solid #0284c7',
            position: 'relative',
          }}
        >
          {apenasLeitura && onFechar && (
            <button
              onClick={onFechar}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Fechar"
            >
              ✕
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>📜</span>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                Termo de Concordância, Sigilo e Responsabilidade Operacional
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                Regulamento Oficial de Acesso, Proteção de Dados e Boas Práticas no PDV e Estoque
              </p>
            </div>
          </div>
        </div>

        {/* IDENTIFICAÇÃO DO USUÁRIO */}
        <div
          style={{
            background: '#f8fafc',
            padding: '10px 20px',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.82rem',
            color: '#334155',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <strong>Usuário Conectado:</strong> {usuarioNome} ({perfilNome})
          </div>
          {lojaNome && (
            <div>
              <strong>Supermercado:</strong> {lojaNome}
            </div>
          )}
        </div>

        {/* CORPO DO TERMO COM SCROLL */}
        <div
          onScroll={handleScroll}
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            fontSize: '0.88rem',
            lineHeight: 1.65,
            color: '#334155',
            flex: 1,
            background: '#ffffff',
          }}
        >
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              color: '#0369a1',
              fontSize: '0.84rem',
            }}
          >
            ℹ️ <strong>Aviso Obrigatório de Primeiro Acesso:</strong> Para garantir a integridade dos dados fiscais, financeiros e o controle rigoroso de estoque, todos os colaboradores e administradores devem ler e aceitar formalmente as diretrizes abaixo.
          </div>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '14px 0 6px 0' }}>
            1. Confidencialidade e Proteção de Dados (LGPD)
          </h3>
          <p style={{ margin: '0 0 10px 0' }}>
            O usuário compromete-se a manter total sigilo sobre todas as informações comerciais, preços de custo, margens de lucro, listas de fornecedores, cadastros e dívidas de clientes fiado a que tiver acesso durante a operação do sistema. É terminantemente vedado copiar, exportar ou compartilhar dados com terceiros sem autorização expressa da diretoria do supermercado.
          </p>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '14px 0 6px 0' }}>
            2. Pessoalidade e Intransferibilidade de Senhas e PIN
          </h3>
          <p style={{ margin: '0 0 10px 0' }}>
            O Login, CPF e a Senha/PIN de acesso fornecidos ao colaborador são estritamente pessoais e intransferíveis. O usuário é o único responsável civil e administrativamente por todas as vendas, aberturas de caixa, sangrias, suprimentos e cancelamentos efetuados sob sua credencial autenticada. Nunca forneça seu código de acesso a outros colaboradores.
          </p>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '14px 0 6px 0' }}>
            3. Rigor nas Movimentações de Caixa e Estoque
          </h3>
          <p style={{ margin: '0 0 10px 0' }}>
            Ao abrir o turno de caixa, o operador deve conferir presencialmente a quantia do fundo de troco inicial. Ao encerrar o turno, a conferência deve retratar fielmente a quantia em espécie, comprovantes de cartão e comprovantes PIX. Qualquer divergência, quebra de caixa ou irregularidade de estoque será registrada nos logs de auditoria e submetida à supervisão.
          </p>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '14px 0 6px 0' }}>
            4. Isolamento Seguro de Dados e Acesso Restrito
          </h3>
          <p style={{ margin: '0 0 10px 0' }}>
            O sistema opera com isolamento de permissões (RBAC). O usuário concorda em utilizar exclusivamente as ferramentas liberadas para o seu cargo (Caixa, Repositor, Supervisor ou Administrador). Tentativas de burlar regras, acessar áreas administrativas não autorizadas ou manipular registros configuram falta grave.
          </p>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '14px 0 6px 0' }}>
            5. Auditoria Digital e Rastreabilidade Permanente
          </h3>
          <p style={{ margin: '0 0 10px 0' }}>
            Todas as operações críticas realizadas no sistema — incluindo horários de abertura e fechamento de turno, vendas concluídas, estornos solicitados, baixas por perda/vencimento e pagamentos fiado recebidos — são automaticamente carimbadas com data, hora, ID do operador e armazenadas em banco de dados em nuvem para fins de auditoria interna.
          </p>

          <div
            style={{
              marginTop: '20px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.8rem',
              color: '#64748b',
              textAlign: 'center',
            }}
          >
            Versão do Termo: <strong>2026.2-PROD</strong> | Registro Digital: <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
          </div>
        </div>

        {/* RODAPÉ COM CONFIRMAÇÃO */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {!apenasLeitura && (
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '0.88rem',
                color: '#1e293b',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={concordo}
                onChange={(e) => setConcordo(e.target.checked)}
                style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <span>
                Li atentamente, compreendi e concordo integralmente com as obrigações, normas de sigilo e responsabilidades de uso do sistema.
              </span>
            </label>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {apenasLeitura && onFechar ? (
              <button
                type="button"
                onClick={onFechar}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Fechar Visualização
              </button>
            ) : (
              <button
                type="button"
                disabled={!concordo}
                onClick={handleConfirmar}
                style={{
                  background: concordo ? '#16a34a' : '#94a3b8',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: concordo ? 'pointer' : 'not-allowed',
                  boxShadow: concordo ? '0 4px 12px rgba(22, 163, 74, 0.3)' : 'none',
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
              >
                ✅ Aceitar Termo e Iniciar Sessão
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
