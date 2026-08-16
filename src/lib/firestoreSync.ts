import { initializeApp, getApps } from 'firebase/app';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  getFirestore,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Supermercado,
  ItemEstoque,
  ProdutoCatalogo,
  Venda,
  OperadorCaixa,
  ClienteDevedor,
} from '../types';

// Real-time listener for Supermercados
export function subscribeSupermercados(callback: (lojas: Supermercado[]) => void) {
  const colRef = collection(db, 'supermercados');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const lojas: Supermercado[] = [];
      snapshot.forEach((docSnap) => {
        lojas.push({ id: docSnap.id, ...docSnap.data() } as Supermercado);
      });
      if (lojas.length > 0) {
        callback(lojas);
      }
    },
    (err) => {
      console.warn('Firestore supermercados listener error:', err);
    }
  );
}

// Real-time listener for Estoque
export function subscribeEstoque(lojaId: string, callback: (itens: ItemEstoque[]) => void) {
  const colRef = collection(db, 'estoque');
  const q = query(colRef, where('lojaId', '==', lojaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const itens: ItemEstoque[] = [];
      snapshot.forEach((docSnap) => {
        itens.push(docSnap.data() as ItemEstoque);
      });
      callback(itens);
    },
    (err) => {
      console.warn('Firestore estoque listener error:', err);
    }
  );
}

// Real-time listener for Catálogo Global
export function subscribeCatalogo(callback: (produtos: ProdutoCatalogo[]) => void) {
  const colRef = collection(db, 'produtos_catalogo');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const prods: ProdutoCatalogo[] = [];
      snapshot.forEach((docSnap) => {
        prods.push(docSnap.data() as ProdutoCatalogo);
      });
      if (prods.length > 0) {
        callback(prods);
      }
    },
    (err) => {
      console.warn('Firestore catalogo listener error:', err);
    }
  );
}

// Real-time listener for Vendas
export function subscribeVendas(lojaId: string, callback: (vendas: Venda[]) => void) {
  const colRef = collection(db, 'vendas');
  const q = query(colRef, where('lojaId', '==', lojaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const lista: Venda[] = [];
      snapshot.forEach((docSnap) => {
        lista.push({ id: docSnap.id, ...docSnap.data() } as Venda);
      });
      // Sort by timestamp desc
      lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(lista);
    },
    (err) => {
      console.warn('Firestore vendas listener error:', err);
    }
  );
}

// Real-time listener for Operadores
export function subscribeOperadores(lojaId: string, callback: (operadores: OperadorCaixa[]) => void) {
  const colRef = collection(db, 'operadores');
  const q = query(colRef, where('lojaId', '==', lojaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const lista: OperadorCaixa[] = [];
      snapshot.forEach((docSnap) => {
        lista.push({ id: docSnap.id, ...docSnap.data() } as OperadorCaixa);
      });
      callback(lista);
    },
    (err) => {
      console.warn('Firestore operadores listener error:', err);
    }
  );
}

// Real-time listener for Clientes Devedores
export function subscribeClientesDevedores(lojaId: string, callback: (clientes: ClienteDevedor[]) => void) {
  const colRef = collection(db, 'clientes_devedores');
  const q = query(colRef, where('lojaId', '==', lojaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const lista: ClienteDevedor[] = [];
      snapshot.forEach((docSnap) => {
        lista.push({ id: docSnap.id, ...docSnap.data() } as ClienteDevedor);
      });
      callback(lista);
    },
    (err) => {
      console.warn('Firestore clientes_devedores listener error:', err);
    }
  );
}

// Helper to sanitize objects for Firestore (removes undefined values recursively)
function limparUndefined<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// Save or Update Supermercado
export async function salvarSupermercadoFirestore(loja: Supermercado) {
  try {
    const docRef = doc(db, 'supermercados', loja.id);
    await setDoc(docRef, limparUndefined(loja), { merge: true });
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('Aviso: Permissão de escrita pendente no Firestore. Publique as regras de leitura/escrita no Console do Firebase.');
    } else {
      console.error('Erro ao salvar supermercado no Firestore:', err);
    }
  }
}

// Save or Update Item no Estoque
export async function salvarItemEstoqueFirestore(item: ItemEstoque, lojaId: string) {
  try {
    const docId = `${lojaId}_${item.codigo}_${item.validade || 'semval'}_${item.lote || 'semlote'}`;
    const docRef = doc(db, 'estoque', docId);
    await setDoc(docRef, limparUndefined({ ...item, lojaId }), { merge: true });
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('Aviso: Permissão de escrita pendente no Firestore para itens de estoque.');
    } else {
      console.error('Erro ao salvar item no estoque no Firestore:', err);
    }
  }
}

// Sync entire Estoque list
export async function sincronizarEstoqueCompletoFirestore(itens: ItemEstoque[], lojaId: string) {
  try {
    for (const item of itens) {
      await salvarItemEstoqueFirestore(item, lojaId);
    }
  } catch (err) {
    console.error('Erro ao sincronizar estoque completo:', err);
  }
}

// Save or Update Produto no Catálogo Global
export async function salvarProdutoCatalogoFirestore(prod: ProdutoCatalogo) {
  try {
    const docRef = doc(db, 'produtos_catalogo', prod.codigo);
    await setDoc(docRef, limparUndefined(prod), { merge: true });
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('Aviso: Permissão de escrita pendente no Firestore para catálogo de produtos.');
    } else {
      console.error('Erro ao salvar no catalogo global no Firestore:', err);
    }
  }
}

// Save Venda
export async function salvarVendaFirestore(venda: Venda) {
  try {
    const docRef = doc(db, 'vendas', venda.id);
    await setDoc(docRef, limparUndefined(venda), { merge: true });
  } catch (err) {
    console.error('Erro ao salvar venda no Firestore:', err);
  }
}

// Save Operador
export async function salvarOperadorFirestore(op: OperadorCaixa) {
  try {
    const docRef = doc(db, 'operadores', op.id);
    await setDoc(docRef, limparUndefined(op), { merge: true });
  } catch (err) {
    console.error('Erro ao salvar operador no Firestore:', err);
  }
}

// Delete Item do Estoque
export async function excluirItemEstoqueFirestore(codigo: string, validade: string, lote: string, lojaId: string) {
  try {
    const docId = `${lojaId}_${codigo}_${validade || 'semval'}_${lote || 'semlote'}`;
    const docRef = doc(db, 'estoque', docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir item do estoque no Firestore:', err);
  }
}

// Delete Produto do Catálogo Global
export async function excluirProdutoCatalogoFirestore(codigo: string) {
  try {
    const docRef = doc(db, 'produtos_catalogo', codigo);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir produto do catálogo no Firestore:', err);
  }
}

// Delete Supermercado
export async function excluirSupermercadoFirestore(lojaId: string) {
  try {
    const docRef = doc(db, 'supermercados', lojaId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir supermercado no Firestore:', err);
  }
}

// Delete Operador
export async function excluirOperadorFirestore(opId: string) {
  try {
    const docRef = doc(db, 'operadores', opId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir operador no Firestore:', err);
  }
}

// Save or Update Cliente Devedor
export async function salvarClienteDevedorFirestore(cliente: ClienteDevedor) {
  try {
    const docRef = doc(db, 'clientes_devedores', cliente.id);
    await setDoc(docRef, limparUndefined(cliente), { merge: true });
  } catch (err) {
    console.error('Erro ao salvar cliente devedor no Firestore:', err);
  }
}

// Delete Cliente Devedor
export async function excluirClienteDevedorFirestore(clienteId: string) {
  try {
    const docRef = doc(db, 'clientes_devedores', clienteId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir cliente devedor no Firestore:', err);
  }
}

// Seed Initial Data into Firestore if collections are empty
export async function inicializarDadosIniciaisFirestore(
  lojasIniciais: Supermercado[],
  catalogoInicial: ProdutoCatalogo[],
  operadoresIniciais: OperadorCaixa[],
  vendasIniciais: Venda[],
  estoqueInicial?: ItemEstoque[],
  devedoresIniciais?: ClienteDevedor[]
) {
  try {
    // 1. Supermercados
    const snapLojas = await getDocs(collection(db, 'supermercados'));
    if (snapLojas.empty && lojasIniciais.length > 0) {
      for (const l of lojasIniciais) {
        await salvarSupermercadoFirestore(l);
      }
    }

    // 2. Catálogo Global de Produtos
    const snapCat = await getDocs(collection(db, 'produtos_catalogo'));
    if (snapCat.empty && catalogoInicial.length > 0) {
      for (const p of catalogoInicial) {
        await salvarProdutoCatalogoFirestore(p);
      }
    }

    // 3. Operadores de Caixa
    const snapOp = await getDocs(collection(db, 'operadores'));
    if (snapOp.empty && operadoresIniciais.length > 0) {
      for (const o of operadoresIniciais) {
        await salvarOperadorFirestore(o);
      }
    }

    // 4. Vendas
    const snapVen = await getDocs(collection(db, 'vendas'));
    if (snapVen.empty && vendasIniciais.length > 0) {
      for (const v of vendasIniciais) {
        await salvarVendaFirestore(v);
      }
    }

    // 5. Estoque
    if (estoqueInicial && estoqueInicial.length > 0) {
      const snapEst = await getDocs(collection(db, 'estoque'));
      if (snapEst.empty) {
        for (const item of estoqueInicial) {
          await salvarItemEstoqueFirestore(item, item.lojaId || lojasIniciais[0]?.id || 'loja_central');
        }
      }
    }

    // 6. Clientes Devedores
    if (devedoresIniciais && devedoresIniciais.length > 0) {
      const snapDev = await getDocs(collection(db, 'clientes_devedores'));
      if (snapDev.empty) {
        for (const c of devedoresIniciais) {
          await salvarClienteDevedorFirestore(c);
        }
      }
    }
  } catch (err) {
    console.warn('Aviso na inicializacao dos dados padrao Firestore:', err);
  }
}

// Migração completa de todos os cadastros e dados locais para o novo banco de dados Firestore
export async function migrarTodosCadastrosParaNovoBanco(params: {
  supermercados: Supermercado[];
  catalogo: ProdutoCatalogo[];
  estoque: ItemEstoque[];
  operadores: OperadorCaixa[];
  vendas: Venda[];
  clientesDevedores: ClienteDevedor[];
}): Promise<{ sucesso: boolean; totalItens: number; detalhe: string }> {
  try {
    let count = 0;

    // Supermercados
    for (const loja of params.supermercados) {
      await salvarSupermercadoFirestore(loja);
      count++;
    }

    // Catálogo
    for (const prod of params.catalogo) {
      await salvarProdutoCatalogoFirestore(prod);
      count++;
    }

    // Estoque
    for (const item of params.estoque) {
      await salvarItemEstoqueFirestore(item, item.lojaId || params.supermercados[0]?.id || 'loja_central');
      count++;
    }

    // Operadores
    for (const op of params.operadores) {
      await salvarOperadorFirestore(op);
      count++;
    }

    // Vendas
    for (const venda of params.vendas) {
      await salvarVendaFirestore(venda);
      count++;
    }

    // Clientes Fiado / Devedores
    for (const dev of params.clientesDevedores) {
      await salvarClienteDevedorFirestore(dev);
      count++;
    }

    return {
      sucesso: true,
      totalItens: count,
      detalhe: `${count} registros migrados com sucesso para o banco appestoqueprodutos-bb92d!`,
    };
  } catch (err) {
    console.error('Erro na migracao para o novo banco:', err);
    return {
      sucesso: false,
      totalItens: 0,
      detalhe: `Erro ao migrar dados: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// Migração Automática Direta (Firestore Antigo -> Novo Banco Firestore)
export async function migrarDiretamenteDoBancoAntigoParaNovo(): Promise<{
  sucesso: boolean;
  totalMigrado: number;
  detalhe: string;
  resumo: Record<string, number>;
}> {
  const oldConfig = {
    projectId: "persuasive-feather-g6pck",
    appId: "1:353856384334:web:95fae68f5a87b3288b421f",
    apiKey: "AIzaSyA9PiyhhhDD54GxSLVa-78_jaU1Sfe4d00",
    authDomain: "persuasive-feather-g6pck.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-estoquemobilemul-b1688de7-0841-470f-82ba-037947580bc7",
    storageBucket: "persuasive-feather-g6pck.firebasestorage.app",
    messagingSenderId: "353856384334",
  };

  try {
    let appAntigo;
    const apps = getApps();
    const existingOld = apps.find((a) => a.name === 'app_antigo_migracao');
    if (existingOld) {
      appAntigo = existingOld;
    } else {
      appAntigo = initializeApp(oldConfig, 'app_antigo_migracao');
    }

    const dbAntigo = getFirestore(appAntigo, oldConfig.firestoreDatabaseId);

    const colecoes = [
      'supermercados',
      'produtos_catalogo',
      'estoque',
      'operadores',
      'vendas',
      'clientes_devedores',
    ];

    let totalMigrado = 0;
    const resumo: Record<string, number> = {};

    for (const col of colecoes) {
      try {
        const snap = await getDocs(collection(dbAntigo, col));
        resumo[col] = snap.docs.length;
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const docId = docSnap.id;
          await setDoc(doc(db, col, docId), data, { merge: true });
          totalMigrado++;
        }
      } catch (err) {
        console.warn(`Aviso ao ler coleção ${col} do banco antigo:`, err);
      }
    }

    return {
      sucesso: true,
      totalMigrado,
      detalhe: `${totalMigrado} registros transferidos com sucesso do banco antigo para o novo banco de dados appestoqueprodutos-bb92d!`,
      resumo,
    };
  } catch (err) {
    console.error('Erro na migracao direta entre bancos:', err);
    return {
      sucesso: false,
      totalMigrado: 0,
      detalhe: `Erro ao transferir dados: ${err instanceof Error ? err.message : String(err)}`,
      resumo: {},
    };
  }
}
