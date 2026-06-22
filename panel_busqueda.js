    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
    const db = getFirestore(app);

    // Elementos DOM
    const selectGrupo = document.getElementById('select-grupo');
    const selectEstudiante = document.getElementById('select-estudiante');
    const selectMaestro = document.getElementById('select-maestro');
    const selectMateria = document.getElementById('select-materia');
    const btnBuscar = document.getElementById('btn-buscar');
    const btnLimpiar = document.getElementById('btn-limpiar');
    const tbodyNotas = document.getElementById('tbody-notas');
    const loadingStatus = document.getElementById('loading-status');
    const studentCountSpan = document.getElementById('student-count');

    // Contadores y estadísticas
    const contadorGrupos = document.getElementById('contador-grupos');
    const contadorEstudiantes = document.getElementById('contador-estudiantes');
    const contadorMaestros = document.getElementById('contador-maestros');
    const contadorMaterias = document.getElementById('contador-materias');
    const contadorNotas = document.getElementById('contador-notas');
    const progressBar = document.getElementById('progress-bar');
    const progressStep = document.getElementById('progress-step');
    const progressPercent = document.getElementById('progress-percent');
    const statusCarga = document.getElementById('status-carga');
    const statCards = document.querySelectorAll('.stat-card');

    // Estructura de caché para relación entre colecciones
    let cache = {
        gruposMap: new Map(),       // id_grupo -> { nombre, estudiantesSet, maestrosSet, materiasSet }
        estudiantesMap: new Map(),  // correo -> nombre
        maestrosMap: new Map(),     // correo -> nombre
        materiasMap: new Map(),     // id_materia -> nombre
        notasList: []               // lista de objetos nota {estudianteId, grupoId, maestroId, materiaId, final_anual}
    };

    async function cargarTodosLosDatos() {
        try {
            // 1. Cargar GRUPOS (colección "Grupos")
            updateProgress(5, 'Cargando grupos (campo id_grupo)...');
            const gruposSnap = await getDocs(collection(db, "Grupos"));
            let gruposUnicos = new Map();
            gruposSnap.forEach(doc => {
                const data = doc.data();
                const idGrupo = data.id_grupo;
                if (idGrupo !== undefined && idGrupo !== null) {
                    if (!gruposUnicos.has(idGrupo)) {
                        gruposUnicos.set(idGrupo, {
                            estudiantes: new Set(),
                            maestros: new Set(),
                            materias: new Set()
                        });
                    }
                    // Almacenar posibles relaciones según los correos del documento
                    if (data.correo_estudiante) gruposUnicos.get(idGrupo).estudiantes.add(data.correo_estudiante);
                    if (data.correo_maestro) gruposUnicos.get(idGrupo).maestros.add(data.correo_maestro);
                }
            });
            for (let [id, rel] of gruposUnicos.entries()) {
                cache.gruposMap.set(id, {
                    nombre: `Grupo ${id}`,
                    estudiantes: rel.estudiantes,
                    maestros: rel.maestros,
                    materias: rel.materias
                });
            }
            contadorGrupos.textContent = cache.gruposMap.size;
            updateProgress(20, `Grupos únicos: ${cache.gruposMap.size}`);

            // 2. Cargar ESTUDIANTES
            updateProgress(25, 'Cargando estudiantes...');
            const estudiantesSnap = await getDocs(collection(db, "estudiantes"));
            estudiantesSnap.forEach(doc => {
                const data = doc.data();
                if (data.correo) {
                    cache.estudiantesMap.set(data.correo, data.nombre || 'Sin nombre');
                }
            });
            contadorEstudiantes.textContent = cache.estudiantesMap.size;
            updateProgress(40, `Estudiantes: ${cache.estudiantesMap.size}`);

            // 3. Cargar MAESTROS
            updateProgress(45, 'Cargando maestros...');
            const maestrosSnap = await getDocs(collection(db, "maestro"));
            maestrosSnap.forEach(doc => {
                const data = doc.data();
                if (data.correo) {
                    cache.maestrosMap.set(data.correo, data.nombre || 'Profesor');
                }
            });
            contadorMaestros.textContent = cache.maestrosMap.size;
            updateProgress(55, `Maestros: ${cache.maestrosMap.size}`);

            // 4. Cargar MATERIAS
            updateProgress(60, 'Cargando materias...');
            const materiasSnap = await getDocs(collection(db, "Materias"));
            materiasSnap.forEach(doc => {
                const data = doc.data();
                if (data.id_materia) {
                    cache.materiasMap.set(data.id_materia.toString(), data.nombre || 'Materia');
                }
            });
            contadorMaterias.textContent = cache.materiasMap.size;
            updateProgress(70, `Materias: ${cache.materiasMap.size}`);

            // 5. Cargar NOTAS y enriquecer relaciones de grupos (materias desde notas)
            updateProgress(75, 'Cargando notas y vinculando materias...');
            const notasSnap = await getDocs(collection(db, "Notas"));
            let totalNotas = 0;
            let procesadas = 0;
            notasSnap.forEach(doc => {
                const data = doc.data();
                totalNotas++;
                const materiaId = data.id_materia ? data.id_materia.toString() : null;
                const correoEst = data.correo_estudiante;
                const finalAnual = data.final_anual;
                
                // Buscar a qué grupo pertenece este estudiante según la colección Grupos
                let grupoAsociado = null;
                for (let [idGrupo, info] of cache.gruposMap.entries()) {
                    if (info.estudiantes.has(correoEst)) {
                        grupoAsociado = idGrupo;
                        break;
                    }
                }
                
                if (grupoAsociado && materiaId) {
                    // Agregar materia al grupo si aún no existe
                    if (!cache.gruposMap.get(grupoAsociado).materias.has(materiaId)) {
                        cache.gruposMap.get(grupoAsociado).materias.add(materiaId);
                    }
                }
                
                // Guardar nota en lista
                cache.notasList.push({
                    estudianteId: correoEst,
                    grupoId: grupoAsociado,
                    maestroId: data.correo_maestro || null,
                    materiaId: materiaId,
                    nota: finalAnual !== undefined ? finalAnual : 'N/A'
                });
                procesadas++;
                if (procesadas % 3 === 0 || procesadas === totalNotas) {
                    let pct = 75 + Math.min(20, Math.floor((procesadas / (notasSnap.size || 1)) * 20));
                    updateProgress(pct, `Procesando notas: ${procesadas}/${notasSnap.size}`);
                }
            });
            contadorNotas.textContent = totalNotas;
            updateProgress(98, `Notas cargadas: ${totalNotas}`);
            
            // Actualizar contadores de estudiantes/maestros/materias por grupo (visual en selector)
            updateProgress(100, 'Finalizando organización...');
            setTimeout(() => {
                statCards.forEach(card => card.classList.remove('loading-stat'));
                statusCarga.innerHTML = '<i class="fa-solid fa-circle-check"></i> Sincronizado';
                progressBar.style.width = '100%';
                progressPercent.textContent = '100%';
            }, 300);
            
            poblarSelectorGrupos();
            selectGrupo.disabled = false;
            mostrarMensajeInicial();
            
        } catch (error) {
            console.error("Error crítico:", error);
            statusCarga.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Error DB';
            tbodyNotas.innerHTML = `<tr><td colspan="6"><div class="no-results-container"><i class="fa-solid fa-bug"></i><div class="no-results-text">Error: ${error.message}</div></div></td></tr>`;
        }
    }
    
    function updateProgress(percent, message) {
        progressBar.style.width = percent + '%';
        progressPercent.textContent = percent + '%';
        progressStep.textContent = message;
    }
    
    function poblarSelectorGrupos() {
        // Añadir opción para TODOS los grupos
        selectGrupo.innerHTML = '<option value="__todos__">-- Todos los Grupos --</option><option value="">-- Selecciona un Grupo Específico --</option>';
        const gruposOrdenados = Array.from(cache.gruposMap.keys()).sort((a,b) => {
            if (typeof a === 'number' && typeof b === 'number') return a - b;
            return String(a).localeCompare(String(b));
        });
        for (let id of gruposOrdenados) {
            const info = cache.gruposMap.get(id);
            const numEst = info.estudiantes.size;
            const numMae = info.maestros.size;
            const numMat = info.materias.size;
            selectGrupo.innerHTML += `<option value="${id}">Grupo ${id} (${numEst} est, ${numMae} prof, ${numMat} mats)</option>`;
        }
    }
    
    function actualizarSelectoresPorGrupo(grupoId) {
        // Limpiar dependientes
        selectEstudiante.innerHTML = '<option value="">Todos los estudiantes</option>';
        selectMaestro.innerHTML = '<option value="">Todos los maestros</option>';
        selectMateria.innerHTML = '<option value="">Todas las materias</option>';
        
        // Si es "todos los grupos" o no hay grupo válido, deshabilitar y mostrar mensaje
        if (!grupoId || grupoId === "__todos__" || !cache.gruposMap.has(grupoId)) {
            selectEstudiante.disabled = true;
            selectMaestro.disabled = true;
            selectMateria.disabled = true;
            studentCountSpan.textContent = '0';
            
            // Si es "todos los grupos", habilitamos filtros globales? Por lógica, mejor dejarlos deshabilitados
            if (grupoId === "__todos__") {
                selectEstudiante.disabled = false;
                selectMaestro.disabled = false;
                selectMateria.disabled = false;
                
                // Poblar estudiantes con todos los estudiantes de la caché
                const todosEstudiantes = Array.from(cache.estudiantesMap.keys()).map(correo => ({
                    correo,
                    nombre: cache.estudiantesMap.get(correo) || correo
                })).sort((a,b) => a.nombre.localeCompare(b.nombre));
                todosEstudiantes.forEach(est => {
                    selectEstudiante.innerHTML += `<option value="${est.correo}">${est.nombre} (${est.correo})</option>`;
                });
                studentCountSpan.textContent = todosEstudiantes.length;
                
                // Poblar maestros con todos los maestros
                const todosMaestros = Array.from(cache.maestrosMap.keys()).map(correo => ({
                    correo,
                    nombre: cache.maestrosMap.get(correo) || correo
                })).sort((a,b) => a.nombre.localeCompare(b.nombre));
                todosMaestros.forEach(prof => {
                    selectMaestro.innerHTML += `<option value="${prof.correo}">${prof.nombre}</option>`;
                });
                
                // Poblar materias con todas las materias
                const todasMaterias = Array.from(cache.materiasMap.keys()).map(idMat => ({
                    id: idMat,
                    nombre: cache.materiasMap.get(idMat) || idMat
                })).sort((a,b) => a.nombre.localeCompare(b.nombre));
                todasMaterias.forEach(mat => {
                    selectMateria.innerHTML += `<option value="${mat.id}">${mat.nombre}</option>`;
                });
            }
            return;
        }
        
        const grupo = cache.gruposMap.get(grupoId);
        const estudiantesArr = Array.from(grupo.estudiantes).map(correo => ({
            correo,
            nombre: cache.estudiantesMap.get(correo) || correo
        })).sort((a,b) => a.nombre.localeCompare(b.nombre));
        
        estudiantesArr.forEach(est => {
            selectEstudiante.innerHTML += `<option value="${est.correo}">${est.nombre} (${est.correo})</option>`;
        });
        studentCountSpan.textContent = estudiantesArr.length;
        selectEstudiante.disabled = false;
        
        const maestrosArr = Array.from(grupo.maestros).map(correo => ({
            correo,
            nombre: cache.maestrosMap.get(correo) || correo
        })).sort((a,b) => a.nombre.localeCompare(b.nombre));
        maestrosArr.forEach(prof => {
            selectMaestro.innerHTML += `<option value="${prof.correo}">${prof.nombre}</option>`;
        });
        selectMaestro.disabled = false;
        
        const materiasArr = Array.from(grupo.materias).map(idMat => ({
            id: idMat,
            nombre: cache.materiasMap.get(idMat) || idMat
        })).sort((a,b) => a.nombre.localeCompare(b.nombre));
        materiasArr.forEach(mat => {
            selectMateria.innerHTML += `<option value="${mat.id}">${mat.nombre}</option>`;
        });
        selectMateria.disabled = false;
    }
    
    function mostrarMensajeInicial() {
        tbodyNotas.innerHTML = `<tr><td colspan="6"><div class="no-results-container"><i class="fa-solid fa-hand-pointer"></i><div class="no-results-text">Selecciona un grupo y aplica filtros</div><div class="no-results-sub">Los datos están listos. Escoge un grupo para ver las notas.</div></div></td></tr>`;
    }
    
    async function buscarNotas() {
        const grupoId = selectGrupo.value;
        if (!grupoId) {
            mostrarMensajeInicial();
            return;
        }
        
        loadingStatus.style.display = "flex";
        tbodyNotas.innerHTML = '';
        
        try {
            const estudianteFiltro = selectEstudiante.value;
            const maestroFiltro = selectMaestro.value;
            const materiaFiltro = selectMateria.value;
            
            let notasFiltradas = cache.notasList.filter(nota => {
                // Filtrar por grupo solo si no es "todos los grupos"
                if (grupoId !== "__todos__" && nota.grupoId != grupoId) return false;
                if (estudianteFiltro && nota.estudianteId !== estudianteFiltro) return false;
                if (maestroFiltro && nota.maestroId !== maestroFiltro) return false;
                if (materiaFiltro && nota.materiaId !== materiaFiltro) return false;
                return true;
            });
            
            if (notasFiltradas.length === 0) {
                loadingStatus.style.display = "none";
                tbodyNotas.innerHTML = `<tr><td colspan="6"><div class="no-results-container"><i class="fa-solid fa-filter-circle-xmark"></i><div class="no-results-text">Sin coincidencias</div><div class="no-results-sub">No hay notas con los filtros aplicados.</div></div></td></tr>`;
                return;
            }
            
            for (let nota of notasFiltradas) {
                const nombreEst = cache.estudiantesMap.get(nota.estudianteId) || 'Desconocido';
                const nombreMaestro = nota.maestroId ? (cache.maestrosMap.get(nota.maestroId) || nota.maestroId) : 'No asignado';
                const nombreMateria = nota.materiaId ? (cache.materiasMap.get(nota.materiaId) || nota.materiaId) : 'Sin materia';
                const notaMostrar = nota.nota !== undefined && nota.nota !== null ? nota.nota : '--';
                const grupoMostrar = nota.grupoId ? `Grupo ${nota.grupoId}` : 'Sin grupo';
                
                const fila = `<tr>
                    <td><strong>${escapeHtml(nombreEst)}</strong></td>
                    <td class="correo-small">${escapeHtml(nota.estudianteId || '')}</td>
                    <td>${escapeHtml(grupoMostrar)}</td>
                    <td>${escapeHtml(nombreMaestro)}</td>
                    <td>${escapeHtml(nombreMateria)}</td>
                    <td><span class="badge-nota">${notaMostrar}</span></td>
                </tr>`;
                tbodyNotas.innerHTML += fila;
            }
            
        } catch (err) {
            console.error(err);
            tbodyNotas.innerHTML = `<td><td colspan="6"><div class="no-results-container"><i class="fa-solid fa-triangle-exclamation"></i><div class="no-results-text">Error consultando</div></div></td></tr>`;
        } finally {
            loadingStatus.style.display = "none";
        }
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
    
    function limpiarFiltros() {
        selectGrupo.value = '';
        selectEstudiante.disabled = true;
        selectMaestro.disabled = true;
        selectMateria.disabled = true;
        selectEstudiante.innerHTML = '<option value="">Primero selecciona un grupo</option>';
        selectMaestro.innerHTML = '<option value="">Primero selecciona un grupo</option>';
        selectMateria.innerHTML = '<option value="">Primero selecciona un grupo</option>';
        studentCountSpan.textContent = '0';
        mostrarMensajeInicial();
    }
    
    selectGrupo.addEventListener('change', (e) => {
        actualizarSelectoresPorGrupo(e.target.value);
        if (e.target.value) {
            buscarNotas(); // auto-búsqueda al cambiar grupo o seleccionar "todos"
        } else {
            mostrarMensajeInicial();
        }
    });
    selectEstudiante.addEventListener('change', () => buscarNotas());
    selectMaestro.addEventListener('change', () => buscarNotas());
    selectMateria.addEventListener('change', () => buscarNotas());
    btnBuscar.addEventListener('click', buscarNotas);
    btnLimpiar.addEventListener('click', () => {
        limpiarFiltros();
    });
    
    // Iniciar la magia
    cargarTodosLosDatos();