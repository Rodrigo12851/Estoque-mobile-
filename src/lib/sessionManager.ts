import { doc, setDoc, onSnapshot, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SessaoUsuario, SessaoAtivaDoc } from '../types';

// Gera token único para a sessão do dispositivo
export function gerarSessaoToken(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const devicePart = (typeof navigator !== 'undefined' ? (navigator.userAgent.length % 999).toString(36) : 'dev');
  return `sess_${time}_${random}_${devicePart}`;
}

// Gera a chave única de identificação da conta
export function obterUserKey(sessao: Partial<SessaoUsuario>): string {
  if (sessao.tipo === 'dona_app') {
    return 'user_master';
  }
  if (sessao.tipo === 'admin_loja') {
    return `admin_loja_${sessao.lojaId || 'default'}`;
  }
  if (sessao.tipo === 'caixa') {
    return `operador_${sessao.operadorId || sessao.lojaId || 'caixa_default'}`;
  }
  return 'user_anonimo';
}

// Registra a nova sessão ativa no Firestore e desautoriza sessões anteriores deste mesmo usuário
export async function registrarSessaoAtivaNoFirestore(sessao: SessaoUsuario, sessaoToken: string): Promise<void> {
  const userKey = sessao.userKey || obterUserKey(sessao);
  
  // Salva localmente o token
  localStorage.setItem('sessao_ativa_token', sessaoToken);
  localStorage.setItem('sessao_ativa_user_key', userKey);

  try {
    const docRef = doc(db, 'sessoes_ativas', userKey);
    const payload: SessaoAtivaDoc = {
      userKey,
      sessaoToken,
      tipo: sessao.tipo,
      usuarioNome: sessao.operadorNome || sessao.lojaNome || 'Proprietário(a) do App',
      lojaId: sessao.lojaId,
      operadorId: sessao.operadorId,
      dataLogin: new Date().toISOString(),
      dispositivoInfo: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 120) : 'Dispositivo Desconhecido',
    };

    await setDoc(docRef, payload);
    console.log(`🔒 Sessão única ativada para [${userKey}] com token [${sessaoToken}]`);
  } catch (err) {
    console.warn('Aviso: Falha ao registrar sessão ativa no Firestore (operando em modo offline local):', err);
  }
}

// Ouve em tempo real o documento da sessão. Se outro aparelho fizer login com esta mesma conta, o token muda e este aparelho é desconectado!
export function monitorarSessaoUnicaDispositivo(
  userKey: string,
  sessaoTokenAtual: string,
  onDesconectarPorConcorrencia: (motivo: string) => void
): () => void {
  if (!userKey || !sessaoTokenAtual) {
    return () => {};
  }

  try {
    const docRef = doc(db, 'sessoes_ativas', userKey);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }
        const data = snapshot.data() as SessaoAtivaDoc;
        if (data && data.sessaoToken && data.sessaoToken !== sessaoTokenAtual) {
          console.warn(`🛑 Sessão invalidada! Outro aparelho conectou-se à conta [${userKey}]. Token atual: ${sessaoTokenAtual}, Novo token: ${data.sessaoToken}`);
          onDesconectarPorConcorrencia(
            `Você foi desconectado porque esta conta acabou de ser acessada em outro dispositivo (${data.dispositivoInfo || 'Outro aparelho'}). Para sua segurança, não é permitido o mesmo usuário conectado em dois aparelhos simultaneamente.`
          );
        }
      },
      (error) => {
        // Fallback silencioso se offline
        console.warn('Monitoramento de sessão em espera (offline):', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Erro ao inicializar monitoramento de sessão única:', err);
    return () => {};
  }
}

// Encerra a sessão ativa ao fazer logout
export async function encerrarSessaoAtivaNoFirestore(userKey: string, sessaoTokenAtual: string): Promise<void> {
  try {
    localStorage.removeItem('sessao_ativa_token');
    localStorage.removeItem('sessao_ativa_user_key');
    const docRef = doc(db, 'sessoes_ativas', userKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as SessaoAtivaDoc;
      if (data.sessaoToken === sessaoTokenAtual) {
        await deleteDoc(docRef);
      }
    }
  } catch (e) {
    console.warn('Aviso ao encerrar sessão no Firestore:', e);
  }
}
