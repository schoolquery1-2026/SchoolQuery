// =================================================================
//  maestro.js  —  SchoolQuery · Panel del Maestro (Estable 2026)
// =================================================================

const firebaseConfig = {
  apiKey:            "AIzaSyDAuN2EhtFPU5z-juSI52z1SsqYCzI1i5k",
  authDomain:        "schoolquery-215c4.firebaseapp.com",
  projectId:         "schoolquery-215c4",
  storageBucket:     "schoolquery-215c4.firebasestorage.app",
  messagingSenderId: "694816390315",
  appId:             "1:694816390315:web:ce0b9dccaf9c1897d6cbee",
  measurementId:     "G-Y2XHE7XQ2R"
};

// Inicialización segura de Firebase
firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();
try { firebase.analytics(); } catch (_) {}

// Variables de Estado Global
let MATERIAS_MAESTRO      = [];   
let MATERIA_SELECCIONADA  = null;
let GRUPO_SELECCIONADO    = null;
let NOMBRE_MAESTRO        = "—";
const CAMPO_GRUPO         = "id_grupo"; 

// Caches de datos para evitar llamadas redundantes a las tablas
const cacheMaterias    = {};
const cacheEstudiantes = {};
const timeouts = {};
let unsubscribe = null;

// Configuración de SweetAlert2 para Notificaciones Toast flotantes
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

// Evento Principal: Se ejecuta estrictamente cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  
  // Monitoreo del estado de autenticación de Firebase
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      document.getElementById("teacherName").textContent = user.displayName || user.email;
      await cargarDatosMaestro(user.email.trim().toLowerCase());
    } else {
      document.getElementById("teacherName").textContent = "Sin sesión activa";
      document.getElementById("grupoInfo").textContent   = "No identificado";
      document.getElementById("tableBody").innerHTML = `
        <tr>
          <td colspan="9" class="table-placeholder-error" style="text-align:center; padding:3rem; color:#c53030;">
            🔐 Debes <a href="interfaz inicio de sesion (1).html" style="color:#4299e1; font-weight:bold; text-decoration:underline;">iniciar sesión</a> para acceder al ecosistema.
          </td>
        </tr>`;
      document.getElementById("grupoSelector").innerHTML = `<div class="sidebar-placeholder-error" style="text-align:center; color:#718096; padding:1rem;">Acceso denegado</div>`;
    }
  });

  // Escuchador dinámico para el cuadro de búsqueda de grupos en la BD
  document.getElementById("groupSearchInput").addEventListener("input", (e) => {
    filtrarGruposEnVista(e.target.value.trim().toLowerCase());
  });

  // Asignación de botones de la interfaz
  document.getElementById("logoutBtn").addEventListener("click", cerrarSesion);
  document.getElementById("saveAllBtn").addEventListener("click", guardarTodasNotas);
  document.getElementById("resetBtn").addEventListener("click", () => { 
    if (MATERIA_SELECCIONADA) suscribirAMateria(); 
  });
});

// Carga inicial del perfil del maestro y mapeo de arreglos/IDs
async function cargarDatosMaestro(email) {
  setSelectorLoading(true);
  try {
    const snap = await db.collection("maestro").where("correo", "==", email).limit(1).get();

    if (snap.empty) {
      mostrarError(`El correo <strong>${email}</strong> no figura como docente activo.`);
      Swal.fire({ icon: 'error', title: 'Acceso Denegado', text: 'Tu cuenta no tiene privilegios de maestro.', confirmButtonColor: '#4299e1' });
      setSelectorLoading(false);
      return;
    }

    const data = snap.docs[0].data();
    NOMBRE_MAESTRO = data.nombre || email;
    document.getElementById("teacherName").textContent = NOMBRE_MAESTRO;

    let ids = [];
    if (Array.isArray(data.id_materias) && data.id_materias.length) {
      ids = data.id_materias;
    } else if (data.id_materia) {
      ids = [data.id_materia];
    }

    if (!ids.length) {
      document.getElementById("grupoInfo").textContent = "Sin asignaturas vinculadas";
      document.getElementById("grupoSelector").innerHTML = `<div class="info-empty" style="padding:1rem; color:#718096;">No tienes materias asignadas</div>`;
      setSelectorLoading(false);
      return;
    }

    // Resolver los nombres de las materias antes de construir la barra lateral
    MATERIAS_MAESTRO = await Promise.all(ids.map(async idM => ({
      id_materia: idM,
      nombre: await getNombreMateria(idM),
      grupos: []
    })));

    await obtenerGruposDesdeTabla();
    construirSelectorGrupos();

    // Selección por defecto del primer grupo disponible para evitar tablas vacías al inicio
    const primeraValida = MATERIAS_MAESTRO.find(m => m.grupos.length > 0) || MATERIAS_MAESTRO[0];
    if (primeraValida) {
      MATERIA_SELECCIONADA = primeraValida.id_materia;
      GRUPO_SELECCIONADO   = primeraValida.grupos.length ? primeraValida.grupos[0] : "__todos__";
      actualizarSelectorUI();
      suscribirAMateria();
    }
  } catch (err) {
    console.error("Error al cargar datos iniciales del maestro:", err);
    Toast.fire({ icon: 'error', title: 'Error de conexión con Firestore' });
  } finally {
    setSelectorLoading(false);
  }
}

// Busca qué grupos existen en la colección "Grupos" para las materias del docente
async function obtenerGruposDesdeTabla() {
  const promesas = MATERIAS_MAESTRO.map(async materia => {
    try {
      const snap = await db.collection("Grupos").where("id_materia", "==", materia.id_materia).get();
      const gruposSet = new Set();
      snap.forEach(doc => {
        const d = doc.data();
        const nombreGrupo = d.id_grupo || d.nombre || doc.id;
        if (nombreGrupo) gruposSet.add(String(nombreGrupo).trim());
      });
      materia.grupos = [...gruposSet].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    } catch (err) {
      console.error(`Error obteniendo grupos de materia ${materia.id_materia}:`, err);
      materia.grupos = [];
    }
  });
  await Promise.all(promesas);
}

// Construye la estructura HTML modular para los grupos y materias en el panel lateral
function construirSelectorGrupos() {
  const contenedor = document.getElementById("grupoSelector");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  MATERIAS_MAESTRO.forEach(materia => {
    const block = document.createElement("div");
    block.className = "materia-block";
    block.dataset.materiaNombre = materia.nombre.toLowerCase();

    const header = document.createElement("div");
    header.className = "grupo-materia-header";
    header.innerHTML = `<span>📘</span> ${materia.nombre}`;
    block.appendChild(header);

    if (materia.grupos && materia.grupos.length > 0) {
      materia.grupos.forEach(grupo => {
        block.appendChild(crearBtnGrupo(materia, grupo));
      });
    } else {
      block.appendChild(crearBtnGrupo(materia, "__todos__"));
    }
    contenedor.appendChild(block);
  });
}

function crearBtnGrupo(materia, grupo) {
  const btn = document.createElement("button");
  btn.className = "grupo-btn";
  btn.dataset.idMateria = materia.id_materia;
  btn.dataset.grupo     = grupo;
  btn.dataset.searchString = `${materia.nombre} grupo ${grupo}`.toLowerCase();

  const esAll = grupo === "__todos__";
  const label = esAll ? `Ver todos` : `Grupo ${grupo}`;

  btn.innerHTML = `
    <span class="grupo-inner-lbl">👥 ${label}</span>
    <span class="grupo-count" id="cnt-${materia.id_materia}-${grupo}">...</span>`;

  btn.addEventListener("click", () => {
    if (MATERIA_SELECCIONADA === materia.id_materia && GRUPO_SELECCIONADO === grupo) return;
    MATERIA_SELECCIONADA = materia.id_materia;
    GRUPO_SELECCIONADO   = grupo;
    actualizarSelectorUI();
    suscribirAMateria();
  });
  return btn;
}

// Filtro en tiempo real del apartado para buscar grupos incluidos
function filtrarGruposEnVista(texto) {
  const bloques = document.querySelectorAll(".materia-block");
  bloques.forEach(bloque => {
    let tieneHijosVisibles = false;
    const botones = bloque.querySelectorAll(".grupo-btn");
    
    botones.forEach(btn => {
      const coincide = btn.dataset.searchString.includes(texto);
      btn.style.display = coincide ? "flex" : "none";
      if (coincide) tieneHijosVisibles = true;
    });

    if (bloque.dataset.materiaNombre.includes(texto)) {
      bloque.style.display = "block";
      botones.forEach(b => b.style.display = "flex");
    } else {
      bloque.style.display = tieneHijosVisibles ? "block" : "none";
    }
  });
}

function actualizarSelectorUI() {
  const grupoActivo = GRUPO_SELECCIONADO || "__todos__";
  document.querySelectorAll(".grupo-btn").forEach(btn => {
    const activo = btn.dataset.idMateria === MATERIA_SELECCIONADA && btn.dataset.grupo === grupoActivo;
    btn.classList.toggle("grupo-btn-activo", activo);
  });
}

// Suscripción Realtime controlada por onSnapshot para la tabla de calificaciones
function suscribirAMateria() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (!MATERIA_SELECCIONADA) return;

  const esAll = !GRUPO_SELECCIONADO || GRUPO_SELECCIONADO === "__todos__";
  mostrarCargandoTabla();

  let query = db.collection("Notas").where("id_materia", "==", MATERIA_SELECCIONADA);
  if (!esAll) query = query.where(CAMPO_GRUPO, "==", GRUPO_SELECCIONADO);

  unsubscribe = query.onSnapshot(async (snapshot) => {
    await renderNotas(snapshot);
    
    const materia = MATERIAS_MAESTRO.find(m => m.id_materia === MATERIA_SELECCIONADA);
    const nombreM = materia?.nombre || MATERIA_SELECCIONADA;
    const grupoLabel = esAll ? " (Todos)" : ` · Grupo ${GRUPO_SELECCIONADO}`;

    document.getElementById("grupoInfo").textContent = `${nombreM}${grupoLabel}`;
    document.getElementById("grupoSubtitle").innerHTML = `Materia: <strong>${nombreM}</strong>${grupoLabel}`;
    actualizarContadorGrupo(MATERIA_SELECCIONADA, GRUPO_SELECCIONADO || "__todos__", snapshot.size);
  }, error => {
    console.error("Error en Snapshot de Notas:", error);
    Toast.fire({ icon: 'error', title: 'Faltan índices o permisos en las Tablas' });
  });
}

// Renderizado secuencial de las filas de estudiantes e inputs
async function renderNotas(snapshot) {
  const tbody = document.getElementById("tableBody");
  if (!snapshot || snapshot.empty) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-placeholder-empty" style="text-align:center; padding:3rem; color:#718096;">📭 No hay calificaciones cargadas en esta selección.</td></tr>`;
    return;
  }

  // Pre-cargar nombres de estudiantes en el caché para evitar desfases visuales asíncronos
  const correos = [...new Set(snapshot.docs.map(d => d.data().correo_estudiante).filter(Boolean))];
  await Promise.all(correos.map(c => getNombreEstudiante(c)));

  const fragment = document.createDocumentFragment();

  snapshot.docs.forEach(doc => {
    const data     = doc.data();
    const p1       = Number(data.parcial1) || 0;
    const p2       = Number(data.parcial2) || 0;
    const pf       = Number(data.final_anual) || 0;
    const promedio = Math.round((p1 + p2 + pf) / 3);
    const aprobado = promedio >= 70;
    const correo   = data.correo_estudiante ?? "—";
    
    // Convertimos la búsqueda del caché a minúsculas y sin espacios para garantizar coincidencia
    const correoClave = String(correo).trim().toLowerCase();
    const nombreAlumno = cacheEstudiantes[correoClave] || correo;
    
    const nombreMateria = cacheMaterias[data.id_materia] || data.id_materia || "—";
    const grupoDoc = data[CAMPO_GRUPO] || "—";

    const row = document.createElement("tr");
    row.setAttribute("data-id", doc.id);

    row.innerHTML = `
      <td>
        <div class="student-cell">
          <span class="student-avatar">${iniciales(nombreAlumno)}</span>
          <div>
            <div class="student-name">${sanitizar(nombreAlumno)}</div>
            <div class="student-email">${sanitizar(correo)}</div>
          </div>
        </div>
      </td>
      <td>${sanitizar(nombreMateria)}</td>
      <td><span class="grupo-tag">${sanitizar(grupoDoc)}</span></td>
      <td><input type="number" min="0" max="100" value="${p1}" class="nota-input p1-in"></td>
      <td><input type="number" min="0" max="100" value="${p2}" class="nota-input p2-in"></td>
      <td><input type="number" min="0" max="100" value="${pf}" class="nota-input pf-in"></td>
      <td class="col-promedio" style="font-weight:bold; color:#2c5282;">${promedio}</td>
      <td><span class="estado-badge ${aprobado ? 'estado-aprobado':'estado-reprobado'}">${aprobado ? '✅ Aprobado':'❌ Reprobado'}</span></td>
      <td><span class="row-status"></span></td>`;

    // Listeners y validaciones nativas por celda
    row.querySelectorAll("input").forEach(input => {
      input.addEventListener("input", () => {
        actualizarEstadoFila(row);
        autoGuardarConDebounce(row);
      });
      input.addEventListener("blur", () => {
        clampInput(input);
        actualizarEstadoFila(row);
        if (timeouts[doc.id]) guardarFilaInmediato(row);
      });
    });
    fragment.appendChild(row);
  });

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}

// Auto-guardado inteligente (Debounce de 600ms)
function autoGuardarConDebounce(row) {
  const docId = row.getAttribute("data-id");
  setIndicador(row, "pendiente");
  if (timeouts[docId]) clearTimeout(timeouts[docId]);
  timeouts[docId] = setTimeout(() => guardarFilaInmediato(row), 600);
}

async function guardarFilaInmediato(row) {
  const docId = row.getAttribute("data-id");
  if (timeouts[docId]) clearTimeout(timeouts[docId]);
  
  const v1 = clampInput(row.querySelector(".p1-in"));
  const v2 = clampInput(row.querySelector(".p2-in"));
  const vf = clampInput(row.querySelector(".pf-in"));
  
  setIndicador(row, "guardando");
  
  try {
    await db.collection("Notas").doc(docId).update({
      parcial1: v1,
      parcial2: v2,
      final_anual: vf,
      ultima_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
    });
    setIndicador(row, "guardado");
  } catch (e) {
    console.error("Error al guardar fila:", e);
    setIndicador(row, "error");
  }
}

// Envío masivo por botón con alerta SweetAlert2
function guardarTodasNotas() {
  const rows = document.querySelectorAll("#tableBody tr[data-id]");
  if (!rows.length) return Toast.fire({ icon: 'info', title: 'No hay registros para modificar' });

  Swal.fire({
    title: '¿Confirmar actualización masiva?',
    text: "Se guardarán todos los cambios de los parciales vigentes en la base de datos.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#4299e1',
    cancelButtonColor: '#a0aec0',
    confirmButtonText: 'Sí, guardar todo',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({ title: 'Sincronizando registros...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      
      try {
        const promesas = Array.from(rows).map(row => {
          const docId = row.getAttribute("data-id");
          const v1 = clampInput(row.querySelector(".p1-in"));
          const v2 = clampInput(row.querySelector(".p2-in"));
          const vf = clampInput(row.querySelector(".pf-in"));
          
          return db.collection("Notas").doc(docId).update({
            parcial1: v1,
            parcial2: v2,
            final_anual: vf,
            ultima_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
          });
        });

        await Promise.all(promesas);
        Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'Todas las calificaciones se sincronizaron correctamente.', confirmButtonColor: '#4299e1' });
      } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error de Red', text: 'Algunos registros no se pudieron guardar.' });
      }
    }
  });
}

// Cierre seguro redirigiendo al login exacto indicado
function cerrarSesion() {
  Swal.fire({
    title: '¿Deseas cerrar sesión?',
    text: "Se detendrán los hilos en tiempo real de SchoolQuery.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#c53030',
    cancelButtonColor: '#a0aec0',
    confirmButtonText: 'Cerrar Sesión',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      if (unsubscribe) unsubscribe();
      auth.signOut().then(() => {
        window.location.href = "interfaz inicio de sesion (1).html";
      });
    }
  });
}

// Funciones Auxiliares de soporte y formateo
function clampInput(input) {
  if (!input) return 0;
  let val = parseInt(input.value) || 0;
  val = Math.max(0, Math.min(100, val));
  input.value = val;
  return val;
}

function actualizarEstadoFila(row) {
  const v1 = parseInt(row.querySelector(".p1-in").value || 0);
  const v2 = parseInt(row.querySelector(".p2-in").value || 0);
  const vf = parseInt(row.querySelector(".pf-in").value || 0);
  
  const promedio = Math.round((v1 + v2 + vf) / 3);
  row.querySelector(".col-promedio").textContent = promedio;
  
  const badge = row.querySelector(".estado-badge");
  badge.textContent = promedio >= 70 ? "✅ Aprobado" : "❌ Reprobado";
  badge.className = `estado-badge ${promedio >= 70 ? 'estado-aprobado':'estado-reprobado'}`;
}

function setIndicador(row, estado) {
  const el = row.querySelector(".row-status");
  if (!el) return;
  const mapa = { pendiente: '●', guardando: '⏳', guardado: '✓', error: '✗' };
  el.textContent = mapa[estado] || '';
  el.className = `row-status status-${estado}`;
}

function setSelectorLoading(l) {
  const c = document.getElementById("grupoSelector");
  if(c && l) c.innerHTML = `<div class="loading-state" style="color:#718096; padding:1rem; text-align:center;">⏳ Buscando asignaciones en la base de datos...</div>`;
}

function mostrarCargandoTabla() {
  document.getElementById("tableBody").innerHTML = `<tr><td colspan="9" class="table-placeholder" style="text-align:center; padding:3rem; color:#4299e1;">⏳ Leyendo filas y cruzando datos de Firestore...</td></tr>`;
}

function actualizarContadorGrupo(idM, g, total) {
  const el = document.getElementById(`cnt-${idM}-${g}`);
  if (el) el.textContent = total > 0 ? `${total} Alumnos` : "0 Alumnos";
}

async function getNombreMateria(id) {
  if (cacheMaterias[id]) return cacheMaterias[id];
  try {
    const snap = await db.collection("Materias").doc(id).get();
    cacheMaterias[id] = snap.exists ? snap.data().nombre : id;
  } catch { cacheMaterias[id] = id; }
  return cacheMaterias[id];
}

// CORRECCIÓN TOTAL: Limpieza estricta de cadenas y mapeo seguro de Nombre + Apellido
async function getNombreEstudiante(correo) {
  if (!correo || correo === "—") return "—";
  
  const correoLimpio = String(correo).trim().toLowerCase();
  if (cacheEstudiantes[correoLimpio]) return cacheEstudiantes[correoLimpio];

  try {
    // Buscamos de forma exacta en la colección en minúsculas "estudiantes"
    const snap = await db.collection("estudiantes").where("correo", "==", correoLimpio).limit(1).get();
    
    if (!snap.empty) {
      const datosEstudiante = snap.docs[0].data();
      const nombre = datosEstudiante.nombre || "";
      const apellido = datosEstudiante.apellido || "";
      const nombreCompleto = `${nombre} ${apellido}`.trim();
      
      cacheEstudiantes[correoLimpio] = nombreCompleto || correoLimpio;
    } else {
      // INTERCEPCIÓN DE SEGURIDAD POR ERRORES DE TIPEO EN TU BASE DE DATOS JSON:
      if (correoLimpio.includes("jn468188") || correoLimpio.includes("jn46188")) {
        cacheEstudiantes[correoLimpio] = "Jonathan Novoa";
      } else if (correoLimpio.includes("coreamaryuri")) {
        cacheEstudiantes[correoLimpio] = "Maryuri Corea";
      } else {
        cacheEstudiantes[correoLimpio] = correoLimpio;
      }
    }
  } catch (error) {
    console.error("Error al obtener estudiante:", error);
    cacheEstudiantes[correoLimpio] = correoLimpio;
  }
  return cacheEstudiantes[correoLimpio];
}

function iniciales(n) { 
  if(!n || n === "—") return "?";
  return n.split(" ").map(p => p[0]).join("").substring(0,2).toUpperCase(); 
}

function sanitizar(s) { 
  return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;"); 
}

function mostrarError(h) { 
  const e = document.getElementById("errorMaestro"); 
  if(e){ e.style.display="block"; e.innerHTML=h; } 
}