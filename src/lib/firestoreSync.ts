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
  getDoc,
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
    (_err) => {
      // Graceful offline/silent fallback
    }
  );
}

// Real-time listener for Estoque com proteção Offline-First (nunca apaga dados locais)
export function subscribeEstoque(lojaId: string, callback: (itens: ItemEstoque[]) => void) {
  const colRef = collection(db, 'estoque');
  const q = query(colRef, where('lojaId', '==', lojaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const itensRemotos: ItemEstoque[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ItemEstoque;
        if (data && data.codigo) {
          itensRemotos.push(data);
        }
      });

      // Ler dados locais salvos
      let itensLocais: ItemEstoque[] = [];
      try {
        const salvo = localStorage.getItem(`estoque_${lojaId}`);
        if (salvo) itensLocais = JSON.parse(salvo);
      } catch (e) {}

      if (itensRemotos.length === 0) {
        // Se a nuvem retornou vazio (offline ou loja recém-criada), mantém e protege os itens locais
        if (itensLocais.length > 0) {
          callback(itensLocais);
        } else {
          callback([]);
        }
        return;
      }

      // Mesclagem inteligente: prioriza dados remotos, preservando itens que foram criados offline
      const mapa = new Map<string, ItemEstoque>();
      itensRemotos.forEach((item) => {
        const chave = `${item.codigo}_${item.validade || ''}_${item.lote || ''}`;
        mapa.set(chave, item);
      });

      // Adiciona itens locais que ainda não subiram para a nuvem
      itensLocais.forEach((item) => {
        const chave = `${item.codigo}_${item.validade || ''}_${item.lote || ''}`;
        if (!mapa.has(chave)) {
          mapa.set(chave, item);
        }
      });

      const listaMesclada = Array.from(mapa.values());
      callback(listaMesclada);
    },
    (_err) => {
      // Em caso de falha de conexão/offline, carrega do localStorage local imediatamente
      try {
        const salvo = localStorage.getItem(`estoque_${lojaId}`);
        if (salvo) {
          const itensLocais = JSON.parse(salvo);
          if (Array.isArray(itensLocais) && itensLocais.length > 0) {
            callback(itensLocais);
          }
        }
      } catch (e) {}
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
        const p = docSnap.data() as ProdutoCatalogo;
        if (p && p.codigo) {
          prods.push(p);
        }
      });

      if (prods.length > 0) {
        callback(prods);
      } else {
        try {
          const salvo = localStorage.getItem('catalogoGlobalFirebase');
          if (salvo) callback(JSON.parse(salvo));
        } catch (e) {}
      }
    },
    (_err) => {
      try {
        const salvo = localStorage.getItem('catalogoGlobalFirebase');
        if (salvo) callback(JSON.parse(salvo));
      } catch (e) {}
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
      const listaRemota: Venda[] = [];
      snapshot.forEach((docSnap) => {
        const v = { id: docSnap.id, ...docSnap.data() } as Venda;
        if (v && v.id) {
          listaRemota.push(v);
        }
      });

      let listaLocal: Venda[] = [];
      try {
        const salvo = localStorage.getItem(`vendas_${lojaId}`);
        if (salvo) listaLocal = JSON.parse(salvo);
      } catch (e) {}

      if (listaRemota.length === 0) {
        if (listaLocal.length > 0) {
          callback(listaLocal);
        } else {
          callback([]);
        }
        return;
      }

      const mapaVendas = new Map<string, Venda>();
      listaRemota.forEach((v) => mapaVendas.set(v.id, v));
      listaLocal.forEach((v) => {
        if (!mapaVendas.has(v.id)) mapaVendas.set(v.id, v);
      });

      const lista = Array.from(mapaVendas.values());
      lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(lista);
    },
    (_err) => {
      try {
        const salvo = localStorage.getItem(`vendas_${lojaId}`);
        if (salvo) callback(JSON.parse(salvo));
      } catch (e) {}
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
      const listaRemota: OperadorCaixa[] = [];
      snapshot.forEach((docSnap) => {
        const op = { id: docSnap.id, ...docSnap.data() } as OperadorCaixa;
        if (op && op.id) {
          listaRemota.push(op);
        }
      });

      let listaLocal: OperadorCaixa[] = [];
      try {
        const salvo = localStorage.getItem(`operadores_caixa_${lojaId}`);
        if (salvo) listaLocal = JSON.parse(salvo);
      } catch (e) {}

      if (listaRemota.length === 0) {
        if (listaLocal.length > 0) {
          callback(listaLocal);
        }
        return;
      }

      const mapaOps = new Map<string, OperadorCaixa>();
      listaRemota.forEach((op) => mapaOps.set(op.id, op));
      listaLocal.forEach((op) => {
        if (!mapaOps.has(op.id)) mapaOps.set(op.id, op);
      });

      callback(Array.from(mapaOps.values()));
    },
    (_err) => {
      try {
        const salvo = localStorage.getItem(`operadores_caixa_${lojaId}`);
        if (salvo) callback(JSON.parse(salvo));
      } catch (e) {}
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
      const listaRemota: ClienteDevedor[] = [];
      snapshot.forEach((docSnap) => {
        const c = { id: docSnap.id, ...docSnap.data() } as ClienteDevedor;
        if (c && c.id) {
          listaRemota.push(c);
        }
      });

      let listaLocal: ClienteDevedor[] = [];
      try {
        const salvo = localStorage.getItem(`clientes_devedores_${lojaId}`);
        if (salvo) listaLocal = JSON.parse(salvo);
      } catch (e) {}

      if (listaRemota.length === 0) {
        if (listaLocal.length > 0) {
          callback(listaLocal);
        }
        return;
      }

      const mapa = new Map<string, ClienteDevedor>();
      listaRemota.forEach((c) => mapa.set(c.id, c));
      listaLocal.forEach((c) => {
        if (!mapa.has(c.id)) mapa.set(c.id, c);
      });

      callback(Array.from(mapa.values()));
    },
    (_err) => {
      try {
        const salvo = localStorage.getItem(`clientes_devedores_${lojaId}`);
        if (salvo) callback(JSON.parse(salvo));
      } catch (e) {}
    }
  );
}

// Helper to sanitize document ID strings for Firestore (removes / \ spaces etc)
export function sanitizarIdDoc(id: string): string {
  if (!id) return 'doc_' + Date.now();
  return String(id).replace(/[\/\\]/g, '_').replace(/[\s\t\n#?\[\]]/g, '_');
}

// Helper to sanitize objects for Firestore (removes undefined values recursively)
function limparUndefined<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// Save or Update Supermercado
export async function salvarSupermercadoFirestore(loja: Supermercado) {
  try {
    const docId = sanitizarIdDoc(loja.id);
    const docRef = doc(db, 'supermercados', docId);
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
    const safeLojaId = sanitizarIdDoc(lojaId || 'loja_padrao');
    const safeCod = sanitizarIdDoc(item.codigo || 'semcod');
    const safeVal = sanitizarIdDoc(item.validade || 'semval');
    const safeLote = sanitizarIdDoc(item.lote || 'semlote');
    const docId = `${safeLojaId}_${safeCod}_${safeVal}_${safeLote}`;
    const docRef = doc(db, 'estoque', docId);
    await setDoc(docRef, limparUndefined({ ...item, lojaId }), { merge: true });
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('Aviso: Permissão de escrita pendente no Firestore para itens de estoque.');
    } else {
      console.error('Erro ao salvar item no estoque no Firestore:', err);
    }
    throw err;
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
    const safeCod = sanitizarIdDoc(prod.codigo || 'semcod');
    const docRef = doc(db, 'produtos_catalogo', safeCod);
    await setDoc(docRef, limparUndefined(prod), { merge: true });
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('Aviso: Permissão de escrita pendente no Firestore para catálogo de produtos.');
    } else {
      console.error('Erro ao salvar no catalogo global no Firestore:', err);
    }
    throw err;
  }
}

// Direct Lookup in Firestore Catalog by Barcode
export async function buscarProdutoCatalogoFirestore(codigo: string): Promise<ProdutoCatalogo | null> {
  try {
    const cleanCod = codigo.trim();
    if (!cleanCod) return null;
    const safeCod = sanitizarIdDoc(cleanCod);
    const docRef = doc(db, 'produtos_catalogo', safeCod);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ProdutoCatalogo;
    }
    // Try query if ID was stored differently
    const q = query(collection(db, 'produtos_catalogo'), where('codigo', '==', cleanCod));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      return qSnap.docs[0].data() as ProdutoCatalogo;
    }
    return null;
  } catch (err) {
    console.warn('Aviso ao consultar produto no catalogo do Firestore:', err);
    return null;
  }
}

// Direct Lookup in Firestore Inventory by Barcode (across current store or any store)
export async function buscarItemEstoquePorCodigoFirestore(codigo: string, lojaId?: string): Promise<ItemEstoque | null> {
  try {
    const cleanCod = codigo.trim();
    if (!cleanCod) return null;
    const colRef = collection(db, 'estoque');
    const q = lojaId
      ? query(colRef, where('codigo', '==', cleanCod), where('lojaId', '==', lojaId))
      : query(colRef, where('codigo', '==', cleanCod));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as ItemEstoque;
    }
    return null;
  } catch (err) {
    console.warn('Aviso ao consultar item no estoque do Firestore:', err);
    return null;
  }
}

// Save Venda
export async function salvarVendaFirestore(venda: Venda) {
  try {
    const docId = sanitizarIdDoc(venda.id);
    const docRef = doc(db, 'vendas', docId);
    await setDoc(docRef, limparUndefined(venda), { merge: true });
  } catch (err) {
    console.error('Erro ao salvar venda no Firestore:', err);
  }
}

// Save Operador
export async function salvarOperadorFirestore(op: OperadorCaixa) {
  try {
    const docId = sanitizarIdDoc(op.id);
    const docRef = doc(db, 'operadores', docId);
    await setDoc(docRef, limparUndefined(op), { merge: true });
  } catch (err) {
    console.error('Erro ao salvar operador no Firestore:', err);
  }
}

// Delete Item do Estoque
export async function excluirItemEstoqueFirestore(codigo: string, validade: string, lote: string, lojaId: string) {
  try {
    const safeLojaId = sanitizarIdDoc(lojaId || 'loja_padrao');
    const safeCod = sanitizarIdDoc(codigo || 'semcod');
    const safeVal = sanitizarIdDoc(validade || 'semval');
    const safeLote = sanitizarIdDoc(lote || 'semlote');
    const docId = `${safeLojaId}_${safeCod}_${safeVal}_${safeLote}`;
    const docRef = doc(db, 'estoque', docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir item do estoque no Firestore:', err);
  }
}

// Delete Produto do Catálogo Global
export async function excluirProdutoCatalogoFirestore(codigo: string) {
  try {
    const safeCod = sanitizarIdDoc(codigo || 'semcod');
    const docRef = doc(db, 'produtos_catalogo', safeCod);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir produto do catálogo no Firestore:', err);
  }
}

// Delete Supermercado
export async function excluirSupermercadoFirestore(lojaId: string) {
  try {
    const docId = sanitizarIdDoc(lojaId);
    const docRef = doc(db, 'supermercados', docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir supermercado no Firestore:', err);
  }
}

// Delete Operador
export async function excluirOperadorFirestore(opId: string) {
  try {
    const docId = sanitizarIdDoc(opId);
    const docRef = doc(db, 'operadores', docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir operador no Firestore:', err);
  }
}

// Save or Update Cliente Devedor
export async function salvarClienteDevedorFirestore(cliente: ClienteDevedor) {
  try {
    const docId = sanitizarIdDoc(cliente.id);
    const docRef = doc(db, 'clientes_devedores', docId);
    await setDoc(docRef, limparUndefined(cliente), { merge: true });
  } catch (err) {
    console.error('Erro ao salvar cliente devedor no Firestore:', err);
  }
}

// Delete Cliente Devedor
export async function excluirClienteDevedorFirestore(clienteId: string) {
  try {
    const docId = sanitizarIdDoc(clienteId);
    const docRef = doc(db, 'clientes_devedores', docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir cliente devedor no Firestore:', err);
  }
}

// Save Audit Log to Firestore (Append-Only / Imutável)
export async function salvarLogAuditoriaFirestore(log: {
  id: string;
  lojaId: string;
  operadorId: string;
  operadorNome: string;
  acao: string;
  detalhes: string;
  dataHora: string;
}) {
  try {
    const safeId = sanitizarIdDoc(log.id || 'log_' + Date.now());
    const docRef = doc(db, 'logs_auditoria', safeId);
    await setDoc(docRef, {
      ...limparUndefined(log),
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Aviso ao salvar log de auditoria no Firestore:', err);
  }
}

// Real-time listener for Audit Logs
export function subscribeLogsAuditoria(lojaId: string, callback: (logs: any[]) => void) {
  const colRef = collection(db, 'logs_auditoria');
  const q = query(colRef, where('lojaId', '==', lojaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });
      logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(logs);
    },
    (_err) => {
      // Silent fallback
    }
  );
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
