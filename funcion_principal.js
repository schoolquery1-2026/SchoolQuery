// ============================================================
//  notas-estudiante.js  –  SchoolQuery · Vista de Notas
//  Carga las notas del estudiante que ha iniciado sesión.
// ============================================================

// ── Variables globales ───────────────────────────────────────
let materiasData = [];
let estudianteActual = null;   // { correo, nombre }

// ── Helpers matemáticos ─────────────────────────────────────

/** Promedio de las tres evaluaciones redondeado a 2 decimales */
function calcularPromedio(p1, p2, finalExam) {
  return Math.round(((p1 + p2 + finalExam) / 3) * 100) / 100;
}

/** Estado textual según la nota ≥ 70 */
function determinarEstado(promedio) {
  return promedio >= 70 ? "Aprobado" : "Reprobado";
}

/** Sanitiza texto para evitar XSS al insertarlo como innerHTML */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── SweetAlert2 helpers ─────────────────────────────────────
// Todos los toasts y alerts pasan por estas funciones.

/** Toast flotante de esquina (no interrumpe al usuario) */
function swAlert(mensaje, icono = "info", titulo = "") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    }
  });

  Toast.fire({
    icon: icono,
    title: titulo || mensaje,
    text: titulo ? mensaje : undefined
  });
}

/** Alert de carga (spinner) que devuelve la instancia para poder cerrarlo */
function swLoading(mensaje = "Cargando...") {
  Swal.fire({
    title: mensaje,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading()
  });
}

/** Cierra cualquier Swal abierto */
function swClose() {
  Swal.close();
}

/** Dialog modal estándar (error, warning, etc.) */
function swDialog(titulo, mensaje, icono = "error") {
  Swal.fire({
    icon: icono,
    title: titulo,
    text: mensaje,
    confirmButtonText: "Entendido"
  });
}

// ── Render de la tabla ───────────────────────────────────────

function renderizarNotas() {
  const tbody = document.getElementById("tablaNotasBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  let totalMaterias = materiasData.length;
  let aprobadas     = 0;
  let sumaPromedios = 0;

  if (totalMaterias === 0) {
    const row  = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan    = 6;
    cell.style.textAlign = "center";
    cell.style.padding   = "40px";
    cell.style.color     = "#6c86a3";
    cell.innerHTML = "📭 No hay notas registradas para este estudiante";
    row.appendChild(cell);
    tbody.appendChild(row);

    document.getElementById("totalMaterias").innerText    = "0";
    document.getElementById("aprobadasCount").innerText   = "0";
    document.getElementById("promedioGeneral").innerText  = "0.0";
    return;
  }

  materiasData.forEach(materia => {
    const { nombre, maestro, parcial1, parcial2, examenFinal } = materia;
    const promedio    = calcularPromedio(parcial1, parcial2, examenFinal);
    const estado      = determinarEstado(promedio);
    const estadoClase = estado === "Aprobado" ? "aprobado" : "reprobado";
    const estadoTexto = estado === "Aprobado" ? "✅ Aprobado" : "❌ Reprobado";

    if (estado === "Aprobado") aprobadas++;
    sumaPromedios += promedio;

    const row = document.createElement("tr");

    // Materia + maestro
    const subjectCell = document.createElement("td");
    subjectCell.style.textAlign  = "left";
    subjectCell.style.fontWeight = "600";
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

    const estadoCell = document.createElement("td");
    estadoCell.innerHTML = `<span class="${estadoClase}">${estadoTexto}</span>`;

    row.append(subjectCell, p1Cell, p2Cell, finalCell, promedioCell, estadoCell);
    tbody.appendChild(row);
  });

  const promedioGeneral = totalMaterias > 0 ? sumaPromedios / totalMaterias : 0;
  document.getElementById("totalMaterias").innerText   = totalMaterias;
  document.getElementById("aprobadasCount").innerText  = aprobadas;
  document.getElementById("promedioGeneral").innerText = promedioGeneral.toFixed(1);
}

// ── Lógica de Firestore ──────────────────────────────────────

async function cargarNotasPorCorreo(correo_estudiante) {
  if (!window.firestoreDB) {
    swAlert("Conectando con la base de datos...", "info");
    return false;
  }

  if (!correo_estudiante || !correo_estudiante.includes("@")) {
    swDialog("Correo inválido", "El correo del usuario autenticado no tiene un formato válido.", "warning");
    return false;
  }

  swLoading("📚 Cargando tus notas...");

  const estadoTexto = document.getElementById("estadoTexto");
  if (estadoTexto) estadoTexto.innerHTML = "🔄 Cargando información...";

  try {
    const { collection, query, where, getDocs } =
      await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    const db = window.firestoreDB;

    // 1 · Verificar que el estudiante existe en Firestore
    const estudiantesRef  = collection(db, "estudiantes");
    const estudianteQuery = query(estudiantesRef, where("correo_estudiantes", "==", correo_estudiante));
    const estudianteSnap  = await getDocs(estudianteQuery);

    if (estudianteSnap.empty) {
      swClose();
      swDialog(
        "Estudiante no encontrado",
        `No existe ningún registro con el correo: ${correo_estudiante}`,
        "error"
      );
      if (estadoTexto) estadoTexto.innerHTML = "❌ Estudiante no encontrado";
      materiasData = [];
      renderizarNotas();
      return false;
    }

    const estudianteDoc   = estudianteSnap.docs[0].data();
    const nombreEstudiante = estudianteDoc.nombre || "Estudiante";

    // Guardar referencia global para uso futuro
    estudianteActual = { correo: correo_estudiante, nombre: nombreEstudiante };

    // Actualizar título de la página
    const heroTitle = document.querySelector(".hero-section h1");
    if (heroTitle) heroTitle.innerHTML = `Mis Notas · ${escapeHtml(nombreEstudiante)}`;

    // 2 · Cargar notas del estudiante
    const notasRef   = collection(db, "Notas");
    const notasQuery = query(notasRef, where("correo_estudiante", "==", correo_estudiante));
    const notasSnap  = await getDocs(notasQuery);

    if (notasSnap.empty) {
      swClose();
      swAlert(`${nombreEstudiante}, no tienes notas registradas aún 📭`, "info");
      if (estadoTexto) estadoTexto.innerHTML = `📭 ${nombreEstudiante}, sin notas registradas`;
      materiasData = [];
      renderizarNotas();
      return true;
    }

    // 3 · Mapa de materias
    const materiasRef  = collection(db, "Materias");
    const materiasSnap = await getDocs(materiasRef);
    const materiasMap  = new Map();
    materiasSnap.forEach(doc => {
      const d = doc.data();
      materiasMap.set(d.id_materia || doc.id, {
        nombre: d.nombre || "Materia sin nombre",
        descripcion: d.descripcion || ""
      });
    });

    // 4 · Mapa de maestros
    const maestrosRef  = collection(db, "maestro");
    const maestrosSnap = await getDocs(maestrosRef);
    const maestrosMap  = new Map();
    maestrosSnap.forEach(doc => {
      const d = doc.data();
      const correo = d.correo_maestro || d.email;
      maestrosMap.set(correo, {
        nombre: d.nombre || d.name || "Profesor",
        especialidad: d.especialidad || ""
      });
    });

    // 5 · Construir array de materias
    materiasData = notasSnap.docs.map(notaDoc => {
      const nota = notaDoc.data();
      const materiaInfo = materiasMap.get(nota.id_materia) || {
        nombre: `Materia ${nota.id_materia || "desconocida"}`,
        descripcion: ""
      };
      const maestroInfo = maestrosMap.get(nota.correo_maestro) || {
        nombre: "Profesor asignado",
        especialidad: ""
      };

      return {
        nombre:        materiaInfo.nombre,
        maestro:       maestroInfo.nombre,
        parcial1:      nota.parcial1    || 0,
        parcial2:      nota.parcial2    || 0,
        examenFinal:   nota.final_anual || nota.examenFinal || 0,
        id_nota:       notaDoc.id,
        id_materia:    nota.id_materia,
        correo_maestro: nota.correo_maestro,
        semestre:      nota.semestre || 1
      };
    });

    renderizarNotas();

    // Resumen para el header de estado
    const aprobadas = materiasData.filter(m => {
      return calcularPromedio(m.parcial1, m.parcial2, m.examenFinal) >= 70;
    }).length;

    if (estadoTexto) {
      estadoTexto.innerHTML =
        `🎓 ${nombreEstudiante} · ${materiasData.length} materias, ${aprobadas} aprobadas`;
    }

    swClose();
    swAlert(
      `Notas cargadas correctamente para ${nombreEstudiante}`,
      "success",
      "✅ Listo"
    );
    return true;

  } catch (error) {
    console.error("Error al cargar notas:", error);
    swClose();
    swDialog(
      "Error de conexión",
      "No se pudo conectar con la base de datos. Revisa tu conexión e intenta de nuevo.",
      "error"
    );
    return false;
  }
}

// ── Inicialización con Firebase Auth ────────────────────────
/**
 * Espera a que Firebase Auth esté listo y obtiene el correo del
 * usuario actualmente autenticado.  Si no hay sesión activa,
 * muestra un aviso y puede redirigir al login.
 */
async function inicializarConAuth() {
  try {
    const { getAuth, onAuthStateChanged } =
      await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    const auth = getAuth();

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ✅ Hay sesión activa: usar el correo del usuario logueado
        const correoActivo = user.email;
        console.log("👤 Usuario autenticado:", correoActivo);
        await cargarNotasPorCorreo(correoActivo);
      } else {
        // ❌ No hay sesión: notificar y redirigir al login
        swClose();
        await Swal.fire({
          icon: "warning",
          title: "Sesión no iniciada",
          text: "Debes iniciar sesión para ver tus notas.",
          confirmButtonText: "Ir al Login",
          allowOutsideClick: false,
          allowEscapeKey: false
        });

        // Redirige a la página de login; ajusta la ruta según tu proyecto
        window.location.href = "/login.html";
      }
    });

  } catch (error) {
    console.error("Error al inicializar Firebase Auth:", error);
    swDialog(
      "Error de autenticación",
      "No se pudo verificar tu sesión. Intenta recargar la página.",
      "error"
    );
  }
}

// ── Esperar Firebase y arrancar ──────────────────────────────
function esperarFirebaseYArrancar(intentos = 0) {
  if (window.firestoreDB) {
    inicializarConAuth();
    return;
  }

  if (intentos >= 20) {                // 10 segundos máximo (20 × 500ms)
    swDialog(
      "Firebase no disponible",
      "No se pudo conectar con la base de datos después de varios intentos. Recarga la página.",
      "error"
    );
    return;
  }

  console.log(`⏳ Esperando Firebase... intento ${intentos + 1}`);
  setTimeout(() => esperarFirebaseYArrancar(intentos + 1), 500);
}

// ── Entry point ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 Página de notas cargada.");
  esperarFirebaseYArrancar();
});
