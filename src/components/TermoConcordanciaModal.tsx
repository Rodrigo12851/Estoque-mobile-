import React, { useState } from 'react';

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

  if (!visivel) return null;

  const handleConfirmar = () => {
    if (!concordo && !apenasLeitura) {
      alert('Por favor, marque a caixa de confirmação para aceitar o termo e continuar.');
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
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '560px',
          borderRadius: '18px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh',
        }}
      >
        {/* CABEÇALHO DO TERMO */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '18px 20px',
            color: '#ffffff',
            borderBottom: '3px solid #0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>📜</span>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: '#ffffff' }}>
                Termo de Uso e Segurança
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Normas de acesso, sigilo e boas práticas operacionais
              </p>
            </div>
          </div>
          {apenasLeitura && onFechar && (
            <button
              onClick={onFechar}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              title="Fechar"
            >
              ✕
            </button>
          )}
        </div>

        {/* IDENTIFICAÇÃO SIMPLES DO USUÁRIO */}
        <div
          style={{
            background: '#f1f5f9',
            padding: '8px 16px',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.82rem',
            color: '#334155',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <div>
            <strong>👤 Usuário:</strong> {usuarioNome} <span style={{ color: '#0284c7' }}>({perfilNome})</span>
          </div>
          {lojaNome && (
            <div>
              <strong>🏢 Supermercado:</strong> {lojaNome}
            </div>
          )}
        </div>

        {/* CORPO DO TERMO RESPONSIVO E LEGÍVEL */}
        <div
          style={{
            padding: '16px 18px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            fontSize: '0.92rem',
            lineHeight: 1.6,
            color: '#1e293b',
            flex: 1,
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* BLOCO 1 */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>1. Sigilo e Proteção de Dados (LGPD)</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569' }}>
              É proibido copiar, fotografar ou compartilhar informações confidenciais do supermercado, tais como preços de custo, margens de lucro, relatórios de faturamento, cadastros e dívidas de clientes fiado.
            </p>
          </div>

          {/* BLOCO 2 */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>🔑</span>
              <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>2. Senha e PIN Pessoais</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569' }}>
              Seu login e senha são estritamente pessoais e intransferíveis. Todas as vendas, cancelamentos, aberturas e fechamentos de caixa registrados em seu nome são de sua inteira responsabilidade.
            </p>
          </div>

          {/* BLOCO 3 */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>💵</span>
              <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>3. Caixa e Estoque</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569' }}>
              O operador deve conferir o fundo de troco no início do turno e lançar a contagem exata no fechamento. Baixas de estoque por avaria ou perda devem ter motivo justificado.
            </p>
          </div>

          {/* BLOCO 4 */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>📋</span>
              <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>4. Auditoria Digital</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569' }}>
              Para segurança mútua da loja e dos colaboradores, as ações importantes (como vendas, sangrias e estornos) são registradas com data, hora e operador responsável.
            </p>
          </div>
        </div>

        {/* RODAPÉ COM CHECKBOX E BOTÃO RESPONSIVO */}
        <div
          style={{
            padding: '14px 18px',
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
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.88rem',
                color: '#0f172a',
                cursor: 'pointer',
                fontWeight: 600,
                background: '#ffffff',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
              }}
            >
              <input
                type="checkbox"
                checked={concordo}
                onChange={(e) => setConcordo(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
              />
              <span>Li e concordo com os termos de uso, sigilo e segurança.</span>
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
                  padding: '12px 20px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  width: '100%',
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
                  background: concordo ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#94a3b8',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.96rem',
                  cursor: concordo ? 'pointer' : 'not-allowed',
                  boxShadow: concordo ? '0 4px 14px rgba(22, 163, 74, 0.35)' : 'none',
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
              >
                {concordo ? '✅ Aceitar e Iniciar Sessão' : 'Marque a caixa acima para continuar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
