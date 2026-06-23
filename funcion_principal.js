// =============================================
// CONFIGURACIÓN FIREBASE
// =============================================
const firebaseConfig = {
  apiKey: "AIzaSyDAuN2EhtFPU5z-juSI52z1SsqYCzI1i5k",
  authDomain: "schoolquery-215c4.firebaseapp.com",
  projectId: "schoolquery-215c4",
  storageBucket: "schoolquery-215c4.firebasestorage.app",
  messagingSenderId: "694816390315",
  appId: "1:694816390315:web:ce0b9dccaf9c1897d6cbee",
  measurementId: "G-Y2XHE7XQ2R"
};

const app = initializeApp(firebaseConfig);
window.firestoreDB = getFirestore(app);
window.auth = getAuth(app);
console.log("✅ Firebase inicializado correctamente");

// Cerrar sesión con confirmación
window.cerrarSesion = function () {
  if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
    signOut(window.auth)
      .then(() => { window.location.href = "index.html"; })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error);
        alert("Error al cerrar sesión. Por favor, intenta nuevamente.");
      });
  }
};

// =============================================
// VARIABLES GLOBALES
// =============================================
let materiasData = [];

// =============================================
// UTILIDADES
// =============================================

// Promedio: (parcial1 + parcial2 + final_anual) / 3
function calcularPromedio(p1, p2, finalExam) {
  return Math.round(((p1 + p2 + finalExam) / 3) * 100) / 100;
}

function determinarEstado(promedio) {
  return promedio >= 70 ? "Aprobado" : "Reprobado";
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function mostrarMensaje(mensaje, tipo = "info") {
  const warningCard = document.querySelector('.warning-card');
  if (!warningCard) return;

  document.querySelector('.temp-message')?.remove();

  const colores = {
    error:   { bg: '#ffebee', text: '#c62828' },
    success: { bg: '#e8f5e9', text: '#2e7d32' },
    info:    { bg: '#e3f2fd', text: '#1565c0' },
  };
  const { bg, text } = colores[tipo] || colores.info;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'temp-message temp-' + tipo;
  msgDiv.style.cssText = `
    background-color:${bg};color:${text};padding:10px 15px;
    border-radius:8px;margin-top:10px;text-align:center;
    font-size:14px;border-left:4px solid ${text};
  `;
  msgDiv.innerText = mensaje;
  warningCard.after(msgDiv);
  setTimeout(() => msgDiv.remove(), 5000);
}

// =============================================
// RENDER DE TABLA
// =============================================
function renderizarNotas() {
  const tbody = document.getElementById("tablaNotasBody");
  if (!tbody) return;

  let aprobadas = 0;
  let sumaPromedios = 0;
  tbody.innerHTML = "";

  if (materiasData.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.style.cssText = "text-align:center;padding:40px;color:#6c86a3;";
    cell.innerHTML = "📭 No hay notas registradas para este estudiante";
    row.appendChild(cell);
    tbody.appendChild(row);

    document.getElementById("totalMaterias").innerText = "0";
    document.getElementById("aprobadasCount").innerText = "0";
    document.getElementById("promedioGeneral").innerText = "0.0";
    return;
  }

  materiasData.forEach(materia => {
    const { nombre, maestro, parcial1, parcial2, examenFinal } = materia;
    const promedio = calcularPromedio(parcial1, parcial2, examenFinal);
    const aprobado = promedio >= 70;
    if (aprobado) aprobadas++;
    sumaPromedios += promedio;

    const row = document.createElement("tr");

    const subjectCell = document.createElement("td");
    subjectCell.style.cssText = "text-align:left;font-weight:600;";
    subjectCell.innerHTML = `
      <div class="subject-cell">
        ${escapeHtml(nombre)}
        <span class="teacher-name">${escapeHtml(maestro)}</span>
      </div>`;

    const p1Cell = document.createElement("td");
    p1Cell.innerHTML = `<span class="grade-number" title="Calificación: ${parcial1} puntos">${parcial1}</span>`;

    const p2Cell = document.createElement("td");
    p2Cell.innerHTML = `<span class="grade-number" title="Calificación: ${parcial2} puntos">${parcial2}</span>`;

    const finalCell = document.createElement("td");
    finalCell.innerHTML = `<span class="grade-number" title="Calificación: ${examenFinal} puntos">${examenFinal}</span>`;

    const promedioCell = document.createElement("td");
    promedioCell.innerHTML = `<span class="promedio-highlight" title="Promedio = (P1 + P2 + Final) / 3">${promedio.toFixed(2)}</span>`;

    const estadoTexto = aprobado ? "✅ Aprobado" : "❌ Reprobado";
    const estadoClase = aprobado ? "aprobado" : "reprobado";
    const estadoCell = document.createElement("td");
    estadoCell.innerHTML = `<span class="${estadoClase}">${estadoTexto}</span>`;

    row.append(subjectCell, p1Cell, p2Cell, finalCell, promedioCell, estadoCell);
    tbody.appendChild(row);
  });

  const total = materiasData.length;
  const promedioGeneral = total > 0 ? sumaPromedios / total : 0;
  document.getElementById("totalMaterias").innerText = total;
  document.getElementById("aprobadasCount").innerText = aprobadas;
  document.getElementById("promedioGeneral").innerText = promedioGeneral.toFixed(1);
}

// =============================================
// CARGA DE NOTAS POR CORREO
// =============================================
async function cargarNotasPorCorreo(correo) {
  if (!window.firestoreDB) {
    mostrarMensaje("⚠️ Conectando con la base de datos...", "info");
    return false;
  }

  // FIX BUG 1: validación básica de correo
  if (!correo || !correo.includes('@')) {
    mostrarMensaje("📧 Correo electrónico inválido", "error");
    return false;
  }

  mostrarMensaje("📚 Cargando tus notas...", "info");

  const estadoTexto = document.getElementById("estadoTexto");
  if (estadoTexto) estadoTexto.innerHTML = "🔄 Cargando información...";

  try {
    const { collection, query, where, getDocs } = await import(
      'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js'
    );
    const db = window.firestoreDB;

    // 1. Verificar que el estudiante existe
    // NOTA: el campo en la colección "estudiantes" se llama "correo_estudiantes" (plural)
    const estudiantesRef = collection(db, "estudiantes");
    const estudianteQuery = query(estudiantesRef, where("correo_estudiantes", "==", correo));
    const estudianteSnapshot = await getDocs(estudianteQuery);

    if (estudianteSnapshot.empty) {
      mostrarMensaje("❌ No se encontró ningún estudiante con ese correo", "error");
      if (estadoTexto) estadoTexto.innerHTML = "❌ Estudiante no encontrado";
      materiasData = [];
      renderizarNotas();
      return false;
    }

    const estudianteData = estudianteSnapshot.docs[0].data();
    const nombreEstudiante = estudianteData.nombre || "Estudiante";

    const heroTitle = document.querySelector('.hero-section h1');
    if (heroTitle) heroTitle.innerHTML = `Mis Notas · ${escapeHtml(nombreEstudiante)}`;

    // 2. Cargar notas
    // FIX BUG 1: la colección "Notas" usa "correo_estudiante" (singular) — debe coincidir exactamente
    const notasRef = collection(db, "Notas");
    const notasQuery = query(notasRef, where("correo_estudiante", "==", correo));
    const notasSnapshot = await getDocs(notasQuery);

    if (notasSnapshot.empty) {
      mostrarMensaje(`📭 ${nombreEstudiante}, no tienes notas registradas aún`, "info");
      if (estadoTexto) estadoTexto.innerHTML = `📭 ${nombreEstudiante}, sin notas registradas`;
      materiasData = [];
      renderizarNotas();
      return true;
    }

    // 3. Obtener materias
    const materiasRef = collection(db, "Materias");
    const materiasSnapshot = await getDocs(materiasRef);
    const materiasMap = new Map();
    materiasSnapshot.forEach(doc => {
      const data = doc.data();
      materiasMap.set(data.id_materia || doc.id, {
        nombre: data.nombre || "Materia sin nombre",
        descripcion: data.descripcion || ""
      });
    });

    // 4. Obtener maestros
    const maestrosRef = collection(db, "maestro");
    const maestrosSnapshot = await getDocs(maestrosRef);
    const maestrosMap = new Map();
    maestrosSnapshot.forEach(doc => {
      const data = doc.data();
      const key = data.correo_maestro || data.email;
      maestrosMap.set(key, { nombre: data.nombre || data.name || "Profesor" });
    });

    // 5. Construir datos
    materiasData = notasSnapshot.docs.map(notaDoc => {
      const nota = notaDoc.data();
      const materiaInfo = materiasMap.get(nota.id_materia) || { nombre: `Materia ${nota.id_materia || 'desconocida'}` };
      const maestroInfo = maestrosMap.get(nota.correo_maestro) || { nombre: 'Profesor asignado' };
      return {
        nombre: materiaInfo.nombre,
        maestro: maestroInfo.nombre,
        parcial1: nota.parcial1 || 0,
        parcial2: nota.parcial2 || 0,
        examenFinal: nota.final_anual || nota.examenFinal || 0,
        id_nota: notaDoc.id,
        id_materia: nota.id_materia,
        correo_maestro: nota.correo_maestro,
        semestre: nota.semestre || 1
      };
    });

    renderizarNotas();

    const aprobadas = materiasData.filter(m =>
      calcularPromedio(m.parcial1, m.parcial2, m.examenFinal) >= 70
    ).length;

    if (estadoTexto) {
      estadoTexto.innerHTML = `🎓 ${nombreEstudiante} · ${materiasData.length} materias, ${aprobadas} aprobadas`;
    }

    mostrarMensaje(`✅ Notas cargadas correctamente para ${nombreEstudiante}`, "success");
    return true;

  } catch (error) {
    console.error("Error al cargar notas:", error);
    mostrarMensaje("⚠️ Error de conexión. Intenta de nuevo.", "error");
    return false;
  }
}

// =============================================
// FIX BUG 2 + 3: usar onAuthStateChanged como
// única fuente de verdad para el correo.
// Elimina el correo hardcodeado y el setTimeout.
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOM listo, esperando sesión de Firebase Auth...");

  onAuthStateChanged(window.auth, async (user) => {
    if (!user || !user.email) {
      // Si no hay sesión activa, redirigir al login
      console.warn("⚠️ No hay usuario autenticado, redirigiendo...");
      window.location.href = "index.html";
      return;
    }

    // Mostrar nombre en el header
    const nombreUsuario = user.email.split('@')[0];
    const bienvenidaSpan = document.getElementById('userName');
    if (bienvenidaSpan) {
      bienvenidaSpan.textContent =
        nombreUsuario.charAt(0).toUpperCase() + nombreUsuario.slice(1);
    }

    // Cargar notas del usuario real autenticado
    console.log("🚀 Usuario autenticado:", user.email);
    await cargarNotasPorCorreo(user.email);
  });
});
