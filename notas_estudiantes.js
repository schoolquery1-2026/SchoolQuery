/**
 * Lógica para la visualización de notas del estudiante
 */

function calculateAverage(p1, p2, final) {
    // Si hay nota final, divide por 3, de lo contrario por 2
    return ((p1 + p2 + (final || 0)) / (final ? 3 : 2)).toFixed(2);
}

function loadGrades() {
    const saved = localStorage.getItem("schoolGrades");
    const tbody = document.getElementById("studentTable");
    
    if (!tbody) return; // Seguridad por si el elemento no existe
    
    tbody.innerHTML = "";

    if (saved) {
        const grades = JSON.parse(saved);
        
        grades.forEach(g => {
            const avg = calculateAverage(g.p1, g.p2, g.final);
            const row = document.createElement("tr");
            row.className = "grade-row";
            
            // Nota: Aquí se usa 'g.subject' o 'g.name' dependiendo de cómo 
            // guardes los datos en el panel del maestro
            const nombreMateria = g.subject || g.name;

            row.innerHTML = `
                <td class="px-8 py-6 font-medium">${nombreMateria}</td>
                <td class="text-center">${g.p1}</td>
                <td class="text-center">${g.p2}</td>
                <td class="text-center">${g.final || '-'}</td>
                <td class="text-center font-bold text-emerald-600">${avg}</td>
                <td class="text-center">
                    <span class="bg-emerald-100 text-emerald-700 px-5 py-1 rounded-full text-sm">
                        ${avg >= 70 ? 'Aprobado' : 'Reprobado'}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-12 text-slate-500">
                    No hay notas disponibles aún.
                </td>
            </tr>`;
    }
}

function logout() {
    if (confirm("¿Cerrar sesión?")) {
        window.location.href = "index.html";
    }
}

// Inicializar la carga al abrir la ventana
window.onload = loadGrades;