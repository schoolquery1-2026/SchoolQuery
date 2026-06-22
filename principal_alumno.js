  const materiasData = [
    { nombre: "Matemática", maestro: "Prof. Carlos Méndez", parcial1: 85, parcial2: 90, examenFinal: 88 },
    { nombre: "Lengua y Literatura", maestro: "Lic. Andrea Ruiz", parcial1: 78, parcial2: 80, examenFinal: 82 },
    { nombre: "Ciencias Naturales", maestro: "Dr. Luis Herrera", parcial1: 60, parcial2: 65, examenFinal: 62 },
    { nombre: "Historia", maestro: "Prof. Marta López", parcial1: 88, parcial2: 92, examenFinal: 90 },
    { nombre: "Inglés Técnico", maestro: "Mtra. Elena Rivas", parcial1: 95, parcial2: 91, examenFinal: 94 },
    { nombre: "Física", maestro: "Prof. Javier Navarro", parcial1: 74, parcial2: 68, examenFinal: 71 }
  ];

  function calcularPromedio(p1, p2, finalExam) {
    let raw = (p1 + p2 + finalExam) / 3;
    return Math.round(raw * 100) / 100;
  }

  function determinarEstado(promedio) {
    return promedio >= 70 ? "Aprobado" : "Reprobado";
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  function renderizarNotas() {
    const tbody = document.getElementById("tablaNotasBody");
    if (!tbody) return;

    let totalMaterias = materiasData.length;
    let aprobadas = 0;
    let sumaPromedios = 0;
    tbody.innerHTML = "";

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
          <span class="teacher-name"><i class="fas fa-chalkboard-user"></i> ${escapeHtml(maestro)}</span>
        </div>
      `;
      
      const p1Cell = document.createElement("td");
      p1Cell.innerHTML = `<span class="grade-number">${parcial1}</span>`;
      
      const p2Cell = document.createElement("td");
      p2Cell.innerHTML = `<span class="grade-number">${parcial2}</span>`;
      
      const finalCell = document.createElement("td");
      finalCell.innerHTML = `<span class="grade-number">${examenFinal}</span>`;
      
      const promedioCell = document.createElement("td");
      promedioCell.innerHTML = `<span class="promedio-highlight">${promedio.toFixed(2)}</span>`;
      
      const estadoCell = document.createElement("td");
      estadoCell.innerHTML = `<span class="${estadoClase}">${estadoTexto}</span>`;
      
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

  document.getElementById("btnCerrarSesion").addEventListener("click", function() {
    if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      window.location.href = "index.html";
    }
  });

  document.getElementById("userName").textContent = "Ana";

  document.addEventListener("DOMContentLoaded", () => {
    renderizarNotas();
  });