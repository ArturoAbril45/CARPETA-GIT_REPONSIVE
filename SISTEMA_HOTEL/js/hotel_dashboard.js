// ========================================
// DATOS DE LA APLICACIÓN
// ========================================

// Datos de habitaciones
const habitaciones = [
    {id: 'H1', tipo: 'Matrimonial', capacidad: 2, estado: 'disponible', precio: 80},
    {id: 'H2', tipo: 'Matrimonial', capacidad: 2, estado: 'ocupada', precio: 80},
    {id: 'H3', tipo: 'Matrimonial', capacidad: 2, estado: 'disponible', precio: 80},
    {id: 'H4', tipo: 'Doble', capacidad: 2, estado: 'limpieza', precio: 75},
    {id: 'H5', tipo: '4 personas', capacidad: 4, estado: 'disponible', precio: 120},
    {id: 'H6', tipo: '4 personas', capacidad: 4, estado: 'ocupada', precio: 120},
    {id: 'H7', tipo: '4 personas', capacidad: 4, estado: 'disponible', precio: 120},
    {id: 'H8', tipo: '4 personas', capacidad: 4, estado: 'ocupada', precio: 120},
    {id: 'H9', tipo: 'Familiar (6)', capacidad: 6, estado: 'disponible', precio: 150},
    {id: 'H10', tipo: 'Grupal (6)', capacidad: 6, estado: 'ocupada', precio: 150},
    {id: 'H11', tipo: 'Grupal (6)', capacidad: 6, estado: 'limpieza', precio: 150},
    {id: 'H12', tipo: 'Grupal (9)', capacidad: 9, estado: 'disponible', precio: 200}
];

// Insumos por habitación
const insumosData = {
    'H1': [
        {nombre: 'Jabón', cantidad: 4, max: 6, unidad: 'unidades'},
        {nombre: 'Papel Higiénico', cantidad: 2, max: 4, unidad: 'rollos'},
        {nombre: 'Toallas', cantidad: 4, max: 4, unidad: 'unidades'},
        {nombre: 'Sábanas', cantidad: 2, max: 2, unidad: 'juegos'}
    ],
    'H2': [
        {nombre: 'Jabón', cantidad: 1, max: 6, unidad: 'unidades'},
        {nombre: 'Papel Higiénico', cantidad: 1, max: 4, unidad: 'rollos'},
        {nombre: 'Toallas', cantidad: 3, max: 4, unidad: 'unidades'},
        {nombre: 'Sábanas', cantidad: 2, max: 2, unidad: 'juegos'}
    ]
};

// Reservas
let reservas = [
    {id: 'R001', habitacion: 'H2', cliente: 'Juan Pérez', checkin: '2024-12-19', checkout: '2024-12-22', estado: 'Confirmada'},
    {id: 'R002', habitacion: 'H6', cliente: 'María López', checkin: '2024-12-20', checkout: '2024-12-25', estado: 'Pendiente'},
    {id: 'R003', habitacion: 'H8', cliente: 'Carlos Díaz', checkin: '2024-12-18', checkout: '2024-12-21', estado: 'En Curso'}
];

// ========================================
// FUNCIONES DE NAVEGACIÓN
// ========================================

/**
 * Cambiar de sección en el dashboard
 */
function showSection(sectionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(sectionId).classList.add('active');
    
    // Actualizar navegación activa
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.closest('.nav-link').classList.add('active');
    
    // Actualizar título
    const titles = {
        'dashboard': 'Dashboard Principal',
        'habitaciones': 'Gestión de Habitaciones',
        'reservas': 'Sistema de Reservas',
        'limpieza': 'Registro de Limpieza',
        'personal': 'Gestión de Personal',
        'insumos': 'Control de Insumos',
        'reportes': 'Reportes y Estadísticas',
        'configuracion': 'Configuración'
    };
    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';
    
    // Cargar contenido específico de la sección
    if (sectionId === 'habitaciones') {
        renderRooms();
    } else if (sectionId === 'reservas') {
        renderReservas();
    } else if (sectionId === 'limpieza') {
        populateHabitacionSelect();
    } else if (sectionId === 'insumos') {
        renderRoomListInsumos();
    }
}

// ========================================
// FUNCIONES DE HABITACIONES
// ========================================

/**
 * Renderizar habitaciones
 */
function renderRooms(filter = 'all') {
    const container = document.getElementById('roomsContainer');
    container.innerHTML = '';
    
    const filtered = filter === 'all' ? habitaciones : habitaciones.filter(h => h.estado === filter);
    
    filtered.forEach(hab => {
        const estadoConfig = {
            'disponible': {badge: 'success', icon: 'check-circle', text: 'Disponible'},
            'ocupada': {badge: 'danger', icon: 'person-fill', text: 'Ocupada'},
            'limpieza': {badge: 'warning', icon: 'tools', text: 'En Limpieza'}
        };
        
        const config = estadoConfig[hab.estado];
        
        const card = `
            <div class="col-md-4">
                <div class="room-card ${hab.estado}" onclick="showRoomDetail('${hab.id}')">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="fw-bold mb-0">${hab.id}</h5>
                        <span class="badge bg-${config.badge}">
                            <i class="bi bi-${config.icon}"></i> ${config.text}
                        </span>
                    </div>
                    <p class="text-muted mb-1 small">${hab.tipo}</p>
                    <p class="text-muted mb-2 small">
                        <i class="bi bi-people"></i> ${hab.capacidad} personas
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                        <strong class="text-primary">$${hab.precio}/noche</strong>
                        <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); showInsumosByRoom('${hab.id}')">
                            <i class="bi bi-box"></i> Insumos
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

/**
 * Filtrar habitaciones
 */
function filterRooms(filter) {
    renderRooms(filter);
}

/**
 * Mostrar detalle de habitación
 */
function showRoomDetail(roomId) {
    const room = habitaciones.find(h => h.id === roomId);
    const modal = new bootstrap.Modal(document.getElementById('modalDetalleHabitacion'));
    
    document.getElementById('modalRoomTitle').textContent = `Habitación ${room.id} - ${room.tipo}`;
    document.getElementById('modalRoomBody').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="fw-bold">Información General</h6>
                <p><strong>Tipo:</strong> ${room.tipo}</p>
                <p><strong>Capacidad:</strong> ${room.capacidad} personas</p>
                <p><strong>Precio:</strong> $${room.precio}/noche</p>
                <p><strong>Estado:</strong> <span class="badge bg-info">${room.estado}</span></p>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold">Acciones</h6>
                <button class="btn btn-primary btn-sm w-100 mb-2" onclick="cambiarEstadoHabitacion('${room.id}', 'disponible')">
                    <i class="bi bi-check-circle"></i> Marcar Disponible
                </button>
                <button class="btn btn-warning btn-sm w-100 mb-2" onclick="cambiarEstadoHabitacion('${room.id}', 'limpieza')">
                    <i class="bi bi-tools"></i> En Limpieza
                </button>
                <button class="btn btn-danger btn-sm w-100" onclick="cambiarEstadoHabitacion('${room.id}', 'ocupada')">
                    <i class="bi bi-person-fill"></i> Marcar Ocupada
                </button>
            </div>
        </div>
    `;
    
    modal.show();
}

/**
 * Cambiar estado de habitación
 */
function cambiarEstadoHabitacion(roomId, nuevoEstado) {
    const room = habitaciones.find(h => h.id === roomId);
    room.estado = nuevoEstado;
    renderRooms();
    bootstrap.Modal.getInstance(document.getElementById('modalDetalleHabitacion')).hide();
    alert(`Habitación ${roomId} actualizada a: ${nuevoEstado}`);
}

// ========================================
// FUNCIONES DE INSUMOS
// ========================================

/**
 * Renderizar lista de habitaciones para insumos
 */
function renderRoomListInsumos() {
    const container = document.getElementById('roomListInsumos');
    container.innerHTML = '';
    
    habitaciones.forEach(hab => {
        const item = `
            <a href="#" class="list-group-item list-group-item-action" onclick="event.preventDefault(); showInsumosByRoom('${hab.id}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${hab.id}</strong> - ${hab.tipo}
                    </div>
                    <i class="bi bi-chevron-right"></i>
                </div>
            </a>
        `;
        container.innerHTML += item;
    });
}

/**
 * Mostrar insumos por habitación
 */
function showInsumosByRoom(roomId) {
    // Navegar a la sección de insumos si no está activa
    const insumosSection = document.getElementById('insumos');
    if (!insumosSection.classList.contains('active')) {
        document.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
        insumosSection.classList.add('active');
        document.getElementById('pageTitle').textContent = 'Control de Insumos';
        
        // Actualizar navegación
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector('[onclick*="insumos"]').classList.add('active');
        
        renderRoomListInsumos();
    }
    
    const container = document.getElementById('insumosDetail');
    const insumos = insumosData[roomId] || [
        {nombre: 'Jabón', cantidad: Math.floor(Math.random() * 6) + 1, max: 6, unidad: 'unidades'},
        {nombre: 'Papel Higiénico', cantidad: Math.floor(Math.random() * 4) + 1, max: 4, unidad: 'rollos'},
        {nombre: 'Toallas', cantidad: Math.floor(Math.random() * 4) + 1, max: 4, unidad: 'unidades'},
        {nombre: 'Sábanas', cantidad: 2, max: 2, unidad: 'juegos'}
    ];
    
    let html = `
        <h5 class="fw-bold mb-3">Habitación ${roomId}</h5>
        <div class="row g-3">
    `;
    
    insumos.forEach(insumo => {
        const porcentaje = (insumo.cantidad / insumo.max) * 100;
        let nivel = 'high';
        if (porcentaje < 30) nivel = 'low';
        else if (porcentaje < 60) nivel = 'medium';
        
        html += `
            <div class="col-md-6">
                <div class="supply-item">
                    <div style="flex: 1;">
                        <div class="d-flex justify-content-between mb-2">
                            <strong>${insumo.nombre}</strong>
                            <span class="text-muted small">${insumo.cantidad}/${insumo.max} ${insumo.unidad}</span>
                        </div>
                        <div class="supply-meter">
                            <div class="supply-meter-fill ${nivel}" style="width: ${porcentaje}%"></div>
                        </div>
                    </div>
                    <div class="ms-3">
                        <button class="btn btn-sm btn-outline-primary" onclick="ajustarInsumo('${roomId}', '${insumo.nombre}', 1)">
                            <i class="bi bi-plus"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="ajustarInsumo('${roomId}', '${insumo.nombre}', -1)">
                            <i class="bi bi-dash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="mt-4">
            <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#modalSolicitarInsumos">
                <i class="bi bi-cart-plus"></i> Solicitar Reposición
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Ajustar cantidad de insumo
 */
function ajustarInsumo(roomId, insumoNombre, cambio) {
    if (!insumosData[roomId]) {
        insumosData[roomId] = [
            {nombre: 'Jabón', cantidad: 4, max: 6, unidad: 'unidades'},
            {nombre: 'Papel Higiénico', cantidad: 2, max: 4, unidad: 'rollos'},
            {nombre: 'Toallas', cantidad: 4, max: 4, unidad: 'unidades'},
            {nombre: 'Sábanas', cantidad: 2, max: 2, unidad: 'juegos'}
        ];
    }
    
    const insumo = insumosData[roomId].find(i => i.nombre === insumoNombre);
    if (insumo) {
        insumo.cantidad = Math.max(0, Math.min(insumo.max, insumo.cantidad + cambio));
        showInsumosByRoom(roomId);
    }
}

/**
 * Solicitar insumos
 */
function solicitarInsumos() {
    bootstrap.Modal.getInstance(document.getElementById('modalSolicitarInsumos')).hide();
    alert('¡Solicitud de insumos enviada correctamente!');
}

// ========================================
// FUNCIONES DE RESERVAS
// ========================================

/**
 * Poblar select de habitaciones
 */
function populateHabitacionSelect() {
    const selects = [
        document.getElementById('selectHabitacion'),
        document.getElementById('reservaHabitacion')
    ];
    
    selects.forEach(select => {
        if (select) {
            select.innerHTML = '<option value="">Seleccionar...</option>';
            habitaciones.forEach(hab => {
                select.innerHTML += `<option value="${hab.id}">${hab.id} - ${hab.tipo}</option>`;
            });
        }
    });
}

/**
 * Renderizar reservas
 */
function renderReservas() {
    const tbody = document.querySelector('#reservasTable tbody');
    tbody.innerHTML = '';
    
    reservas.forEach(reserva => {
        const estadoClass = {
            'Confirmada': 'success',
            'Pendiente': 'warning',
            'En Curso': 'info',
            'Completada': 'secondary'
        };
        
        const row = `
            <tr>
                <td><strong>${reserva.id}</strong></td>
                <td>${reserva.habitacion}</td>
                <td>${reserva.cliente}</td>
                <td>${reserva.checkin}</td>
                <td>${reserva.checkout}</td>
                <td><span class="badge bg-${estadoClass[reserva.estado]}">${reserva.estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-info" onclick="verDetalleReserva('${reserva.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="cancelarReserva('${reserva.id}')">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

/**
 * Guardar reserva
 */
function guardarReserva() {
    const newReserva = {
        id: 'R' + String(reservas.length + 1).padStart(3, '0'),
        habitacion: document.getElementById('reservaHabitacion').value,
        cliente: document.querySelector('#formReserva input[type="text"]').value,
        checkin: document.querySelectorAll('#formReserva input[type="date"]')[0].value,
        checkout: document.querySelectorAll('#formReserva input[type="date"]')[1].value,
        estado: 'Confirmada'
    };
    
    reservas.push(newReserva);
    renderReservas();
    bootstrap.Modal.getInstance(document.getElementById('modalNuevaReserva')).hide();
    document.getElementById('formReserva').reset();
    alert('¡Reserva guardada exitosamente!');
}

/**
 * Ver detalle de reserva
 */
function verDetalleReserva(reservaId) {
    const reserva = reservas.find(r => r.id === reservaId);
    alert(`Detalle de Reserva ${reserva.id}:\n\nCliente: ${reserva.cliente}\nHabitación: ${reserva.habitacion}\nCheck-in: ${reserva.checkin}\nCheck-out: ${reserva.checkout}\nEstado: ${reserva.estado}`);
}

/**
 * Cancelar reserva
 */
function cancelarReserva(reservaId) {
    if (confirm('¿Está seguro de cancelar esta reserva?')) {
        reservas = reservas.filter(r => r.id !== reservaId);
        renderReservas();
        alert('Reserva cancelada correctamente');
    }
}

// ========================================
// FUNCIONES DE GRÁFICOS
// ========================================

/**
 * Inicializar gráficos
 */
function initCharts() {
    // Gráfico de Limpieza
    const ctxLimpieza = document.getElementById('chartLimpieza');
    if (ctxLimpieza) {
        new Chart(ctxLimpieza.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Habitaciones',
                    data: [38, 42, 35, 45, 40, 48, 42],
                    borderColor: '#673ab7',
                    backgroundColor: 'rgba(103, 58, 183, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#673ab7'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: true,
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Gráfico de Estado
    const ctxEstado = document.getElementById('chartEstado');
    if (ctxEstado) {
        new Chart(ctxEstado.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Limpias', 'Ocupadas', 'En Limpieza'],
                datasets: [{
                    data: [42, 8, 2],
                    backgroundColor: ['#4caf50', '#f44336', '#ff9800'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================

/**
 * Inicializar aplicación cuando el DOM esté listo
 */
window.addEventListener('DOMContentLoaded', function() {
    // Inicializar gráficos
    initCharts();
    
    // Poblar selects de habitaciones
    populateHabitacionSelect();
    
    console.log('Dashboard Hotel - Sistema inicializado correctamente');
});