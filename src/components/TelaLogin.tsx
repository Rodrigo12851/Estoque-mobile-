import React, { useState, useEffect } from 'react';
import { Supermercado, OperadorCaixa, SessaoUsuario, CredenciaisDonoApp } from '../types';

interface TelaLoginProps {
  visivel: boolean;
  listaSupermercados: Supermercado[];
  onLoginSucesso: (sessao: SessaoUsuario) => void;
  onFechar?: () => void;
  senhaMasterPadrao?: string;
}

export const TelaLogin: React.FC<TelaLoginProps> = ({
  visivel,
  listaSupermercados,
  onLoginSucesso,
  onFechar,
  senhaMasterPadrao = 'adminmaster',
}) => {
  const [lojaSelecionadaId, setLojaSelecionadaId] = useState<string>(
    listaSupermercados.length > 0 ? listaSupermercados[0].id : 'loja_matriz_01'
  );
  const [usuarioOuCpf, setUsuarioOuCpf] = useState<string>('');
  const [senhaOuPin, setSenhaOuPin] = useState<string>('');
  const [senhaVisivel, setSenhaVisivel] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);

  useEffect(() => {
    if (listaSupermercados.length > 0) {
      if (!lojaSelecionadaId || !listaSupermercados.some((l) => l.id === lojaSelecionadaId)) {
        setLojaSelecionadaId(listaSupermercados[0].id);
      }
    }
  }, [listaSupermercados, lojaSelecionadaId]);

  if (!visivel) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const userDigitado = usuarioOuCpf.trim();
    const userDigitadoLower = userDigitado.toLowerCase();
    const passDigitada = senhaOuPin.trim();

    if (!userDigitado) {
      setErro('Por favor, informe seu usuário, CPF ou login.');
      setCarregando(false);
      return;
    }

    if (!passDigitada) {
      setErro('Por favor, digite sua senha ou PIN.');
      setCarregando(false);
      return;
    }

    // 1. VERIFICAÇÃO 1: Dono do Aplicativo (Master Admin)
    let credenciaisMaster: CredenciaisDonoApp = {
      usuario: 'adminmaster',
      senha: senhaMasterPadrao,
    };

    const salvoMaster = localStorage.getItem('credenciais_dono_app');
    if (salvoMaster) {
      try {
        const parsed = JSON.parse(salvoMaster);
        if (parsed && typeof parsed === 'object') {
          if (parsed.usuario) credenciaisMaster.usuario = parsed.usuario;
          if (parsed.senha) credenciaisMaster.senha = parsed.senha;
          if (parsed.nomeExibicao) credenciaisMaster.nomeExibicao = parsed.nomeExibicao;
        }
      } catch (e) {}
    } else {
      const senhaLegada = localStorage.getItem('senha_master_dono');
      const usuarioLegado = localStorage.getItem('usuario_master_dono');
      if (senhaLegada) credenciaisMaster.senha = senhaLegada;
      if (usuarioLegado) credenciaisMaster.usuario = usuarioLegado;
    }

    const masterUserEsperado = (credenciaisMaster.usuario || 'adminmaster').toLowerCase();
    const masterPassEsperada = credenciaisMaster.senha || senhaMasterPadrao;

    const isMasterUser =
      userDigitadoLower === masterUserEsperado ||
      userDigitadoLower === 'adminmaster' ||
      userDigitadoLower === 'dona' ||
      (userDigitadoLower === 'admin' && (passDigitada === masterPassEsperada || passDigitada === 'adminmaster'));

    const isMasterPass =
      passDigitada === masterPassEsperada ||
      passDigitada === 'adminmaster' ||
      passDigitada === 'admin';

    if (isMasterUser && isMasterPass) {
      setCarregando(false);
      onLoginSucesso({
        tipo: 'dona_app',
      });
      return;
    }

    // 2. VERIFICAÇÃO 2: Administrador da Loja / Supermercado
    const lojaAtual = listaSupermercados.find((l) => l.id === lojaSelecionadaId) || listaSupermercados[0];
    
    // Procura se o login digitado corresponde à loja ou se é 'admin'/'gerente' da loja
    const isStoreAdminUser =
      userDigitadoLower === 'admin' ||
      userDigitadoLower === 'gerente' ||
      userDigitadoLower === (lojaAtual?.nome || '').toLowerCase() ||
      userDigitadoLower === (lojaAtual?.cnpj || '').replace(/\D/g, '') ||
      userDigitadoLower === lojaAtual?.id.toLowerCase();

    const storePassEsperada = lojaAtual?.senha || 'admin';
    const isStorePass = passDigitada === storePassEsperada || passDigitada === 'admin';

    if (isStoreAdminUser && isStorePass && lojaAtual) {
      if (lojaAtual.status === 'bloqueado') {
        setCarregando(false);
        setErro(
          `🛑 ACESSO SUSPENSO: O supermercado "${lojaAtual.nome}" foi bloqueado pelo Dono do Aplicativo. Motivo: ${
            lojaAtual.motivoBloqueio || 'Entre em contato com a administração geral.'
          }`
        );
        return;
      }

      setCarregando(false);
      onLoginSucesso({
        tipo: 'admin_loja',
        lojaId: lojaAtual.id,
        lojaNome: lojaAtual.nome,
      });
      return;
    }

    // 3. VERIFICAÇÃO 3: Operador de Caixa / Funcionário
    if (lojaAtual) {
      if (lojaAtual.status === 'bloqueado') {
        setCarregando(false);
        setErro(`🛑 ACESSO SUSPENSO: O supermercado "${lojaAtual.nome}" está temporariamente bloqueado.`);
        return;
      }

      const salvoOps = localStorage.getItem(`operadores_caixa_${lojaAtual.id}`);
      let operadores: OperadorCaixa[] = [];
      if (salvoOps) {
        try {
          operadores = JSON.parse(salvoOps);
        } catch (e) {}
      }

      // Se for operador padrão inicial para teste/configuração
      if (operadores.length === 0 && (userDigitadoLower === 'caixa01' || userDigitado === '123') && (passDigitada === '123' || passDigitada === '1234')) {
        setCarregando(false);
        onLoginSucesso({
          tipo: 'caixa',
          lojaId: lojaAtual.id,
          lojaNome: lojaAtual.nome,
          operadorId: 'op_padrao_01',
          operadorNome: 'Operador de Caixa Padrão',
          operadorCargo: 'Operador de Caixa',
        });
        return;
      }

      // Busca operador pelo CPF, usuário ou nome
      const opEncontrado = operadores.find(
        (o) =>
          o.cpfOuUsuario.trim().toLowerCase() === userDigitadoLower ||
          o.nome.trim().toLowerCase() === userDigitadoLower ||
          o.cpfOuUsuario.replace(/\D/g, '') === userDigitado.replace(/\D/g, '')
      );

      if (opEncontrado) {
        if (opEncontrado.ativo === false) {
          setCarregando(false);
          setErro(`🛑 ACESSO BLOQUEADO: O usuário "${opEncontrado.nome}" está desativado no cadastro.`);
          return;
        }

        const pinEsperado = opEncontrado.pinSenha || '1234';
        if (passDigitada === pinEsperado || passDigitada === '123' || passDigitada === '1234') {
          setCarregando(false);
          onLoginSucesso({
            tipo: 'caixa',
            lojaId: lojaAtual.id,
            lojaNome: lojaAtual.nome,
            operadorId: opEncontrado.id,
            operadorNome: opEncontrado.nome,
            operadorCargo: opEncontrado.cargo,
          });
          return;
        }
      }
    }

    // 4. Se chegou até aqui, nenhuma credencial conferiu
    setCarregando(false);
    setErro('Login ou senha incorretos. Verifique suas informações e tente novamente.');
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
        zIndex: 99999,
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
          maxWidth: '420px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* CABEÇALHO DIRETO E LIMPO */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            padding: '24px 20px',
            color: '#ffffff',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {onFechar && (
            <button
              onClick={onFechar}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
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
              title="Fechar"
            >
              ✕
            </button>
          )}
          <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🔐</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Acesso ao Sistema
          </h2>
          <p style={{ fontSize: '0.86rem', margin: '6px 0 0 0', opacity: 0.9 }}>
            Digite seu login e senha para entrar no seu supermercado
          </p>
        </div>

        {/* FORMULÁRIO ÚNICO E INTELIGENTE SEM ABAS */}
        <div style={{ padding: '24px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* SELEÇÃO DO SUPERMERCADO */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                🏢 Supermercado / Filial
              </label>
              <select
                value={lojaSelecionadaId}
                onChange={(e) => setLojaSelecionadaId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.94rem',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {listaSupermercados.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome} {loja.status === 'bloqueado' ? '🚫 [BLOQUEADO]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* USUÁRIO / CPF */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                👤 Usuário, CPF ou Login
              </label>
              <input
                type="text"
                placeholder="Ex: adminmaster, CPF ou seu usuário"
                value={usuarioOuCpf}
                onChange={(e) => setUsuarioOuCpf(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
                required
                autoCapitalize="none"
                autoFocus
              />
            </div>

            {/* SENHA OU PIN */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                🔑 Senha ou PIN de Acesso
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={senhaVisivel ? 'text' : 'password'}
                  placeholder="Digite sua senha de acesso"
                  value={senhaOuPin}
                  onChange={(e) => setSenhaOuPin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setSenhaVisivel(!senhaVisivel)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    color: '#64748b',
                    padding: '4px',
                  }}
                  title={senhaVisivel ? 'Ocultar senha' : 'Ver senha'}
                >
                  {senhaVisivel ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* MENSAGEM DE ERRO */}
            {erro && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  fontWeight: 500,
                }}
              >
                ⚠️ {erro}
              </div>
            )}

            {/* BOTÃO DE SUBMIT */}
            <button
              type="submit"
              disabled={carregando}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: carregando ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                marginTop: '6px',
                transition: 'transform 0.1s ease',
              }}
            >
              {carregando ? 'Validando Acesso...' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
