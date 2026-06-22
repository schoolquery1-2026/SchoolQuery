// Variables globales
let materiasData = [];

// Correo del estudiante a cargar automáticamente
const ESTUDIANTE_AUTOMATICO = "jn468188@gmail.com";

// Función para calcular promedio: (parcial1 + parcial2 + final_anual) / 3
function calcularPromedio(p1, p2, finalExam) {
  let raw = (p1 + p2 + finalExam) / 3;
  return Math.round(raw * 100) / 100;
}

// Determinar estado según el promedio (>=70 aprobado)
function determinarEstado(promedio) {
  return promedio >= 70 ? "Aprobado" : "Reprobado";
}

// Escapar HTML para seguridad
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Mostrar mensaje temporal
function mostrarMensaje(mensaje, tipo = "info") {
  const warningCard = document.querySelector('.warning-card');
  if (!warningCard) return;
  
  const existingMsg = document.querySelector('.temp-message');
  if (existingMsg) existingMsg.remove();
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `temp-message temp-${tipo}`;
  msgDiv.style.cssText = `
    background-color: ${tipo === 'error' ? '#ffebee' : (tipo === 'success' ? '#e8f5e9' : '#e3f2fd')};
    color: ${tipo === 'error' ? '#c62828' : (tipo === 'success' ? '#2e7d32' : '#1565c0')};
    padding: 10px 15px;
    border-radius: 8px;
    margin-top: 10px;
    text-align: center;
    font-size: 14px;
    border-left: 4px solid ${tipo === 'error' ? '#c62828' : (tipo === 'success' ? '#2e7d32' : '#1565c0')};
  `;
  msgDiv.innerText = mensaje;
  warningCard.after(msgDiv);
  
  setTimeout(() => msgDiv.remove(), 5000);
}

// Renderizar la tabla de notas
function renderizarNotas() {
  const tbody = document.getElementById("tablaNotasBody");
  if (!tbody) return;

  let totalMaterias = materiasData.length;
  let aprobadas = 0;
  let sumaPromedios = 0;
  tbody.innerHTML = "";

  if (totalMaterias === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.style.textAlign = "center";
    cell.style.padding = "40px";
    cell.style.color = "#6c86a3";
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
    const estado = determinarEstado(promedio);
    const estadoClase = estado === "Aprobado" ? "aprobado" : "reprobado";
    const estadoTexto = estado === "Aprobado" ? "✅ Aprobado" : "❌ Reprobado";

    if (estado === "Aprobado") aprobadas++;
    sumaPromedios += promedio;

    const row = document.createElement("tr");

    const subjectCell = document.createElement("td");
    subjectCell.style.textAlign = "left";
    subjectCell.style.fontWeight = "600";
    subjectCell.innerHTML = `
      <div class="subject-cell">
        ${escapeHtml(nombre)}
        <span class="teacher-name">${escapeHtml(maestro)}</span>
      </div>
    `;
    
    const p1Cell = document.createElement("td");
    p1Cell.innerHTML = `<span class="grade-number" title="Calificación: ${parcial1} puntos">${parcial1}</span>`;
    
    const p2Cell = document.createElement("td");
    p2Cell.innerHTML = `<span class="grade-number" title="Calificación: ${parcial2} puntos">${parcial2}</span>`;
    
    const finalCell = document.createElement("td");
    finalCell.innerHTML = `<span class="grade-number" title="Calificación: ${examenFinal} puntos">${examenFinal}</span>`;
    
    const promedioCell = document.createElement("td");
    promedioCell.innerHTML = `<span class="promedio-highlight" title="Promedio = (P1 + P2 + Final) / 3">${promedio.toFixed(2)}</span>`;
    
    const estadoCell = document.createElement("td");
    estadoCell.innerHTML = `<span class="${estadoClase}" title="${estado === 'Aprobado' ? '✅ Calificación aprobatoria (≥70)' : '❌ Calificación reprobatoria (<70)'}">${estadoTexto}</span>`;
    
    row.appendChild(subjectCell);
    row.appendChild(p1Cell);
    row.appendChild(p2Cell);
    row.appendChild(finalCell);
    row.appendChild(promedioCell);
    row.appendChild(estadoCell);
    
    tbody.appendChild(row);
  });

  const promedioGeneral = totalMaterias > 0 ? (sumaPromedios / totalMaterias) : 0;
  document.getElementById("totalMaterias").innerText = totalMaterias;
  document.getElementById("aprobadasCount").innerText = aprobadas;
  document.getElementById("promedioGeneral").innerText = promedioGeneral.toFixed(1);
}

// Cargar notas por correo del estudiante
async function cargarNotasPorCorreo(correo_estudiantes) {
  if (!window.firestoreDB) {
    mostrarMensaje("⚠️ Conectando con la base de datos...", "info");
    return false;
  }

  if (!correo_estudiantes || !correo_estudiantes.includes('@')) {
    mostrarMensaje("📧 Correo electrónico inválido", "error");
    return false;
  }

  mostrarMensaje("📚 Cargando tus notas...", "info");
  
  // Actualizar estado visual
  const estadoTexto = document.getElementById("estadoTexto");
  if (estadoTexto) {
    estadoTexto.innerHTML = "🔄 Cargando información...";
  }

  try {
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const db = window.firestoreDB;
    
    // 1. Verificar que el estudiante existe
    const estudiantesRef = collection(db, "estudiantes");
    const estudianteQuery = query(estudiantesRef, where("correo_estudiantes", "==", correo_estudiantes));
    const estudianteSnapshot = await getDocs(estudianteQuery);
    
    if (estudianteSnapshot.empty) {
      mostrarMensaje("❌ No se encontró ningún estudiante con ese correo", "error");
      if (estadoTexto) {
        estadoTexto.innerHTML = "❌ Estudiante no encontrado";
      }
      materiasData = [];
      renderizarNotas();
      return false;
    }
    
    const estudianteData = estudianteSnapshot.docs[0].data();
    const nombreEstudiante = estudianteData.nombre || "Estudiante";
    
    // Actualizar título
    const heroTitle = document.querySelector('.hero-section h1');
    if (heroTitle) {
      heroTitle.innerHTML = `Mis Notas · ${escapeHtml(nombreEstudiante)}`;
    }
    
    // 2. Cargar las notas
    const notasRef = collection(db, "Notas");
    const notasQuery = query(notasRef, where("correo_estudiante", "==", correo_estudiantes));
    const notasSnapshot = await getDocs(notasQuery);
    
    if (notasSnapshot.empty) {
      mostrarMensaje(`📭 ${nombreEstudiante}, no tienes notas registradas aún`, "info");
      if (estadoTexto) {
        estadoTexto.innerHTML = `📭 ${nombreEstudiante}, sin notas registradas`;
      }
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
      const idMateria = data.id_materia || doc.id;
      materiasMap.set(idMateria, {
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
      const correo_maestro = data.correo_maestro || data.email;
      maestrosMap.set(correo_maestro, {
        nombre: data.nombre || data.name || "Profesor",
        especialidad: data.especialidad || ""
      });
    });
    
    // 5. Construir datos
    const nuevasMateriasData = [];
    for (const notaDoc of notasSnapshot.docs) {
      const nota = notaDoc.data();
      const materiaInfo = materiasMap.get(nota.id_materia) || { 
        nombre: `Materia ${nota.id_materia || 'desconocida'}`, 
        descripcion: '' 
      };
      const maestroInfo = maestrosMap.get(nota.correo_maestro) || { 
        nombre: 'Profesor asignado', 
        especialidad: '' 
      };
      
      nuevasMateriasData.push({
        nombre: materiaInfo.nombre,
        maestro: maestroInfo.nombre,
        parcial1: nota.parcial1 || 0,
        parcial2: nota.parcial2 || 0,
        examenFinal: nota.final_anual || nota.examenFinal || 0,
        id_nota: notaDoc.id,
        id_materia: nota.id_materia,
        correo_maestro: nota.correo_maestro,
        semestre: nota.semestre || 1
      });
    }
    
    materiasData = nuevasMateriasData;
    renderizarNotas();
    
    // Actualizar mensaje de éxito
    const totalMaterias = materiasData.length;
    const aprobadas = materiasData.filter(m => {
      const prom = calcularPromedio(m.parcial1, m.parcial2, m.examenFinal);
      return prom >= 70;
    }).length;
    
    if (estadoTexto) {
      estadoTexto.innerHTML = `🎓 ${nombreEstudiante} · ${totalMaterias} materias, ${aprobadas} aprobadas`;
    }
    
    mostrarMensaje(`✅ Notas cargadas correctamente para ${nombreEstudiante}`, "success");
    return true;
    
  } catch (error) {
    console.error("Error al cargar notas:", error);
    mostrarMensaje("⚠️ Error de conexión. Intenta de nuevo.", "error");
    return false;
  }
}

// Cargar automáticamente las notas del estudiante predefinido
async function cargarNotasAutomaticamente() {
  console.log("🚀 Cargando notas automáticas para:", ESTUDIANTE_AUTOMATICO);
  
  // Esperar a que Firebase esté listo
  if (!window.firestoreDB) {
    console.log("⏳ Esperando Firebase...");
    setTimeout(cargarNotasAutomaticamente, 500);
    return;
  }
  
  await cargarNotasPorCorreo(ESTUDIANTE_AUTOMATICO);
}

// Inicializar eventos cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 Página cargada, cargando notas automáticamente...");
  
  // Cargar notas automáticamente
  cargarNotasAutomaticamente();
});