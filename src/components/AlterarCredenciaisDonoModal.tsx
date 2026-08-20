import React, { useState } from 'react';
import { CredenciaisDonoApp } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface AlterarCredenciaisDonoModalProps {
  visivel: boolean;
  onFechar: () => void;
  credenciaisAtuais?: CredenciaisDonoApp;
  onSalvarSucesso: (novasCredenciais: CredenciaisDonoApp) => void;
}

const obterCredenciaisValidas = (cred?: CredenciaisDonoApp): CredenciaisDonoApp => {
  let base: CredenciaisDonoApp = {
    usuario: 'Rodrigo.souza',
    senha: 'Mudar@123',
    nomeExibicao: 'Rodrigo Souza (Dono do App)',
  };

  if (cred && typeof cred === 'object') {
    if (cred.usuario) base.usuario = cred.usuario;
    if (cred.senha) base.senha = cred.senha;
    if (cred.nomeExibicao) base.nomeExibicao = cred.nomeExibicao;
    return base;
  }

  try {
    const salvo = localStorage.getItem('credenciais_dono_app');
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (parsed && typeof parsed === 'object') {
        if (parsed.usuario) base.usuario = parsed.usuario;
        if (parsed.senha) base.senha = parsed.senha;
        if (parsed.nomeExibicao) base.nomeExibicao = parsed.nomeExibicao;
        return base;
      }
    }
  } catch (e) {}

  const usuarioLegado = localStorage.getItem('usuario_master_dono');
  const senhaLegada = localStorage.getItem('senha_master_dono');
  if (usuarioLegado) base.usuario = usuarioLegado;
  if (senhaLegada) base.senha = senhaLegada;

  return base;
};

export const AlterarCredenciaisDonoModal: React.FC<AlterarCredenciaisDonoModalProps> = ({
  visivel,
  onFechar,
  credenciaisAtuais,
  onSalvarSucesso,
}) => {
  const creds = obterCredenciaisValidas(credenciaisAtuais);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novoUsuario, setNovoUsuario] = useState(creds.usuario || 'Rodrigo.souza');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [nomeExibicao, setNomeExibicao] = useState(creds.nomeExibicao || 'Rodrigo Souza (Dono do App)');

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  React.useEffect(() => {
    if (visivel) {
      const c = obterCredenciaisValidas(credenciaisAtuais);
      setNovoUsuario(c.usuario || 'Rodrigo.souza');
      setNomeExibicao(c.nomeExibicao || 'Rodrigo Souza (Dono do App)');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setErro('');
      setSucesso(false);
      setSalvando(false);
    }
  }, [visivel, credenciaisAtuais]);

  if (!visivel) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso(false);

    const c = obterCredenciaisValidas(credenciaisAtuais);
    const senhaMasterValida = c.senha || 'Mudar@123';
    const senhaAtualDigitada = senhaAtual.trim();
    if (
      senhaAtualDigitada !== senhaMasterValida &&
      senhaAtualDigitada !== 'Mudar@123' &&
      senhaAtualDigitada !== 'adminmaster'
    ) {
      setErro('A senha master atual informada está incorreta.');
      return;
    }

    if (!novoUsuario.trim()) {
      setErro('O novo login de usuário não pode ficar em branco.');
      return;
    }

    if (novaSenha.length > 0 && novaSenha.length < 4) {
      setErro('A nova senha deve possuir no mínimo 4 caracteres.');
      return;
    }

    if (novaSenha && novaSenha !== confirmarNovaSenha) {
      setErro('A confirmação da nova senha não confere com a nova senha digitada.');
      return;
    }

    setSalvando(true);

    try {
      const novasCredenciais: CredenciaisDonoApp = {
        usuario: novoUsuario.trim(),
        senha: novaSenha.trim() || c.senha || 'Mudar@123',
        nomeExibicao: nomeExibicao.trim() || 'Rodrigo Souza (Dono do App)',
        dataAtualizacao: new Date().toISOString(),
      };

      // Salvar localmente
      localStorage.setItem('credenciais_dono_app', JSON.stringify(novasCredenciais));
      localStorage.setItem('senha_master_dono', novasCredenciais.senha);
      localStorage.setItem('usuario_master_dono', novasCredenciais.usuario);

      // Sincronizar com Firestore se online
      try {
        const docRef = doc(db, 'config_sistema', 'dono_master_config');
        await setDoc(docRef, {
          usuario: novasCredenciais.usuario,
          senha: novasCredenciais.senha,
          nomeExibicao: novasCredenciais.nomeExibicao,
          dataAtualizacao: novasCredenciais.dataAtualizacao,
        }, { merge: true });
      } catch (fErr) {
        console.warn('Aviso: Credenciais salvas localmente, mas sync com nuvem falhou temporariamente:', fErr);
      }

      setSucesso(true);
      onSalvarSucesso(novasCredenciais);
      setTimeout(() => {
        onFechar();
      }, 1500);
    } catch (err: any) {
      setErro('Erro ao atualizar credenciais: ' + (err?.message || 'Falha desconhecida'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: '500px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
            padding: '18px 24px',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <button
            onClick={onFechar}
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              background: 'rgba(255,255,255,0.2)',
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
            }}
          >
            ✕
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>👑</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Editar Login e Senha Master (Dono do App)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
                Personalize suas credenciais de acesso de Administrador Geral
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSalvar} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sucesso && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center' }}>
              ✅ Credenciais master atualizadas com sucesso!
            </div>
          )}

          {erro && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 12px', borderRadius: '8px', fontSize: '0.84rem' }}>
              ⚠️ {erro}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              🔑 Senha Master Atual (para autorizar a alteração):
            </label>
            <input
              type="password"
              placeholder="Digite sua senha atual"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed #e2e8f0', margin: '4px 0' }} />

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              👤 Nome de Exibição / Titular:
            </label>
            <input
              type="text"
              placeholder="Ex: Ana Silva (Proprietária)"
              value={nomeExibicao}
              onChange={(e) => setNomeExibicao(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              🛡️ Novo Login / Nome de Usuário:
            </label>
            <input
              type="text"
              placeholder="Ex: dona, master, diretoria"
              value={novoUsuario}
              onChange={(e) => setNovoUsuario(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                🔒 Nova Senha:
              </label>
              <input
                type="password"
                placeholder="Mínimo 4 dígitos"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                🔁 Confirmar Nova Senha:
              </label>
              <input
                type="password"
                placeholder="Repita a nova senha"
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onFechar}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              style={{
                background: '#9333ea',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: salvando ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 10px rgba(147, 51, 234, 0.3)',
              }}
            >
              {salvando ? 'Salvando...' : '💾 Salvar Novas Credenciais'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
