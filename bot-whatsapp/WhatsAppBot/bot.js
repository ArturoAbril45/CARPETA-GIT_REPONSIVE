const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const pino = require('pino');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgCyan: '\x1b[46m'
};

const log = {
    success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}${msg}${colors.reset}`),
    command: (msg) => console.log(`${colors.magenta}${colors.bright}${msg}${colors.reset}`),
    title: (msg) => console.log(`${colors.bgCyan}${colors.bright} ${msg} ${colors.reset}`),
    subtitle: (msg) => console.log(`${colors.blue}${colors.bright}${msg}${colors.reset}`),
    data: (msg) => console.log(`${colors.white}${msg}${colors.reset}`),
    dim: (msg) => console.log(`${colors.dim}${msg}${colors.reset}`)
};

const CONFIG = {
    numeroNovia: ['207967030886585@lid'],
    miNumero: '593981230920@s.whatsapp.net', // Tu número para no auto-responder
    palabrasProtegidas: ['importante', 'guardar'],
    tiempoLimiteWhatsApp: 60,
    directorioBackup: './backups',
    directorioLogs: './logs',
    archivoEstadisticas: './stats.json',
    archivoUltimosEliminados: './ultimos_eliminados.json',
    archivoRespondidos: './respondidos.json',
    archivoCitas: './citas.json',
    archivoConversaciones: './conversaciones.json',
    modoStealth: true,
    autoresponderActivo: true,
    tiempoEsperaRespuesta: 60000,
    tiempoDisponibilidad: 2,
    mensajeAutoresponder: `¡Hola! 👋 En este momento estoy ocupado, pero estaré disponible en aproximadamente *2 horas*.

Mientras tanto, ¿qué deseas hacer?

*1️⃣* Esperar mi respuesta (te atenderé en 2 horas)
*2️⃣* Dejar tu mensaje (te respondo cuando esté libre)
*3️⃣* Agendar una cita para otro día
*4️⃣* Agendar una videollamada
*5️⃣* Salir del menú

_Responde con el número de tu opción._`,
    mantenerPCDespierta: true,
    intervaloKeepAlive: 120000,
    leerMensajes: false,
    horarioCitas: {
        inicio: '09:00',
        fin: '18:00'
    },
    recordatorioAntes: 24
};

let historialReciente = [];
let keepAliveInterval = null;
let contactosPendientes = new Map();
let recordatoriosInterval = null;

function cargarConversaciones() {
    try {
        if (fs.existsSync(CONFIG.archivoConversaciones)) {
            return JSON.parse(fs.readFileSync(CONFIG.archivoConversaciones, 'utf8'));
        }
    } catch (err) {
        log.error('Error cargando conversaciones: ' + err.message);
    }
    return {};
}

function guardarConversaciones(conversaciones) {
    try {
        fs.writeFileSync(CONFIG.archivoConversaciones, JSON.stringify(conversaciones, null, 2));
    } catch (err) {
        log.error('Error guardando conversaciones: ' + err.message);
    }
}

function obtenerEstadoConversacion(jid) {
    const conversaciones = cargarConversaciones();
    return conversaciones[jid] || { estado: 'inicial', datos: {} };
}

function actualizarEstadoConversacion(jid, estado, datos = {}) {
    const conversaciones = cargarConversaciones();
    conversaciones[jid] = {
        estado: estado,
        datos: datos,
        timestamp: Date.now()
    };
    guardarConversaciones(conversaciones);
}

function limpiarEstadoConversacion(jid) {
    const conversaciones = cargarConversaciones();
    delete conversaciones[jid];
    guardarConversaciones(conversaciones);
}

function cargarCitas() {
    try {
        if (fs.existsSync(CONFIG.archivoCitas)) {
            return JSON.parse(fs.readFileSync(CONFIG.archivoCitas, 'utf8'));
        }
    } catch (err) {
        log.error('Error cargando citas: ' + err.message);
    }
    return [];
}

function guardarCitas(citas) {
    try {
        fs.writeFileSync(CONFIG.archivoCitas, JSON.stringify(citas, null, 2));
    } catch (err) {
        log.error('Error guardando citas: ' + err.message);
    }
}

function agendarCita(jid, datos) {
    const citas = cargarCitas();
    const nuevaCita = {
        id: Date.now(),
        jid: jid,
        tipo: datos.tipo || 'cita',
        fecha: datos.fecha,
        hora: datos.hora,
        motivo: datos.motivo,
        confirmada: false,
        creada: new Date().toISOString()
    };
    citas.push(nuevaCita);
    guardarCitas(citas);
    log.success(`[Cita] Nueva ${datos.tipo} agendada para ${datos.fecha} ${datos.hora}`);
    return nuevaCita;
}

function validarFecha(texto) {
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = texto.match(regex);
    if (!match) return null;
    
    const [, dia, mes, año] = match;
    const fecha = new Date(año, mes - 1, dia);
    
    if (fecha.getDate() != dia || fecha.getMonth() != mes - 1) {
        return null;
    }
    
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${año}`;
}

function validarHora(texto) {
    const regex = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i;
    const match = texto.match(regex);
    if (!match) return null;
    
    let [, hora, minutos, periodo] = match;
    hora = parseInt(hora);
    
    if (periodo) {
        if (periodo.toUpperCase() === 'PM' && hora !== 12) hora += 12;
        if (periodo.toUpperCase() === 'AM' && hora === 12) hora = 0;
    }
    
    if (hora < 0 || hora > 23 || parseInt(minutos) < 0 || parseInt(minutos) > 59) {
        return null;
    }
    
    return `${hora.toString().padStart(2, '0')}:${minutos}`;
}

function verificarRecordatorios(sock) {
    const citas = cargarCitas();
    const ahora = new Date();
    
    citas.forEach(async (cita) => {
        if (cita.confirmada || cita.recordatorioEnviado) return;
        
        const [dia, mes, año] = cita.fecha.split('/');
        const [hora, minutos] = cita.hora.split(':');
        const fechaCita = new Date(año, mes - 1, dia, hora, minutos);
        
        const horasHastaCita = (fechaCita - ahora) / (1000 * 60 * 60);
        
        if (horasHastaCita > 0 && horasHastaCita <= CONFIG.recordatorioAntes && !cita.recordatorioEnviado) {
            const mensaje = `🔔 *Recordatorio de ${cita.tipo}*

Tienes una ${cita.tipo} agendada para:
📅 *Fecha:* ${cita.fecha}
🕐 *Hora:* ${cita.hora}
📝 *Motivo:* ${cita.motivo}

¿Confirmas tu asistencia?
*1️⃣* Sí, confirmo
*2️⃣* Necesito reagendar`;

            try {
                await sock.sendMessage(cita.jid, { text: mensaje });
                cita.recordatorioEnviado = true;
                guardarCitas(citas);
                log.success(`[Recordatorio] Enviado a ${cita.jid.substring(0, 15)}...`);
            } catch (err) {
                log.error('[Recordatorio] Error: ' + err.message);
            }
        }
    });
}

function iniciarSistemaRecordatorios(sock) {
    recordatoriosInterval = setInterval(() => {
        verificarRecordatorios(sock);
    }, 3600000);
    
    log.success('Sistema de recordatorios iniciado');
}

async function procesarMenuInteractivo(sock, mensaje, remitente) {
    const contenido = (mensaje.message.conversation || 
                      mensaje.message.extendedTextMessage?.text || '').trim();
    
    log.info(`[Menu] Procesando de ${remitente.substring(0, 15)}: "${contenido}"`);
    
    const estado = obtenerEstadoConversacion(remitente);
    log.info(`[Menu] Estado actual: ${estado.estado}`);
    
    if (estado.estado === 'inicial' || contenido === '1') {
        if (contenido === '1') {
            await sock.sendMessage(remitente, { 
                text: '⏰ Perfecto, te responderé en aproximadamente 2 horas. ¡Gracias por tu paciencia!' 
            });
            limpiarEstadoConversacion(remitente);
        }
        return;
    }
    
    if (estado.estado === 'inicial' && contenido === '2') {
        actualizarEstadoConversacion(remitente, 'esperando_mensaje');
        await sock.sendMessage(remitente, { 
            text: '💬 Por favor, déjame tu mensaje y te responderé lo antes posible:' 
        });
        return;
    }
    
    if (estado.estado === 'esperando_mensaje') {
        await sock.sendMessage(remitente, { 
            text: `✅ Mensaje recibido. Te responderé cuando esté disponible. ¡Gracias!

Tu mensaje:
"${contenido}"` 
        });
        log.info(`[Mensaje] De ${remitente.substring(0, 15)}: ${contenido.substring(0, 50)}...`);
        limpiarEstadoConversacion(remitente);
        return;
    }
    
    if (estado.estado === 'inicial' && contenido === '3') {
        actualizarEstadoConversacion(remitente, 'esperando_fecha_cita', { tipo: 'cita' });
        await sock.sendMessage(remitente, { 
            text: '📅 ¿Para qué fecha deseas agendar tu cita?\n\n_Ejemplo: 15/01/2026_' 
        });
        return;
    }
    
    if (estado.estado === 'inicial' && contenido === '4') {
        actualizarEstadoConversacion(remitente, 'esperando_fecha_cita', { tipo: 'videollamada' });
        await sock.sendMessage(remitente, { 
            text: '📹 ¿Para qué fecha deseas agendar tu videollamada?\n\n_Ejemplo: 15/01/2026_' 
        });
        return;
    }
    
    if (estado.estado === 'inicial' && contenido === '5') {
        await sock.sendMessage(remitente, { 
            text: '👋 Gracias por contactarme. ¡Hasta pronto!' 
        });
        limpiarEstadoConversacion(remitente);
        return;
    }
    
    if (estado.estado === 'esperando_fecha_cita') {
        const fechaValida = validarFecha(contenido);
        if (!fechaValida) {
            await sock.sendMessage(remitente, { 
                text: '❌ Fecha inválida. Por favor usa el formato: DD/MM/AAAA\n\n_Ejemplo: 20/01/2026_' 
            });
            return;
        }
        
        estado.datos.fecha = fechaValida;
        actualizarEstadoConversacion(remitente, 'esperando_hora_cita', estado.datos);
        await sock.sendMessage(remitente, { 
            text: `🕐 ¿Qué horario prefieres?\n\n_Horario disponible: ${CONFIG.horarioCitas.inicio} - ${CONFIG.horarioCitas.fin}_\n\n_Ejemplo: 14:00 o 2:00 PM_` 
        });
        return;
    }
    
    if (estado.estado === 'esperando_hora_cita') {
        const horaValida = validarHora(contenido);
        if (!horaValida) {
            await sock.sendMessage(remitente, { 
                text: '❌ Hora inválida. Por favor usa el formato: HH:MM\n\n_Ejemplo: 14:00 o 2:00 PM_' 
            });
            return;
        }
        
        estado.datos.hora = horaValida;
        actualizarEstadoConversacion(remitente, 'esperando_motivo_cita', estado.datos);
        await sock.sendMessage(remitente, { 
            text: '📝 ¿Cuál es el motivo de tu ' + (estado.datos.tipo === 'cita' ? 'cita' : 'videollamada') + '?' 
        });
        return;
    }
    
    if (estado.estado === 'esperando_motivo_cita') {
        estado.datos.motivo = contenido;
        const cita = agendarCita(remitente, estado.datos);
        
        const icono = estado.datos.tipo === 'cita' ? '📅' : '📹';
        const tipo = estado.datos.tipo === 'cita' ? 'Cita' : 'Videollamada';
        
        await sock.sendMessage(remitente, { 
            text: `✅ *${tipo} confirmada*

${icono} *Fecha:* ${estado.datos.fecha}
🕐 *Hora:* ${estado.datos.hora}
📝 *Motivo:* ${estado.datos.motivo}

Te enviaré un recordatorio 1 día antes. ¡Nos vemos! 👋` 
        });
        
        limpiarEstadoConversacion(remitente);
        return;
    }
    
    if (estado.estado === 'confirmando_recordatorio') {
        if (contenido === '1') {
            await sock.sendMessage(remitente, { 
                text: '✅ ¡Perfecto! Tu cita está confirmada. ¡Nos vemos!' 
            });
            const citas = cargarCitas();
            const cita = citas.find(c => c.id === estado.datos.citaId);
            if (cita) {
                cita.confirmada = true;
                guardarCitas(citas);
            }
        } else if (contenido === '2') {
            await sock.sendMessage(remitente, { 
                text: '📅 Entendido. ¿Para qué nueva fecha deseas reagendar?\n\n_Ejemplo: 25/01/2026_' 
            });
            actualizarEstadoConversacion(remitente, 'esperando_fecha_cita', { tipo: 'cita', reagendando: true });
            return;
        }
        limpiarEstadoConversacion(remitente);
        return;
    }
    
    if (estado.estado === 'inicial') {
        await sock.sendMessage(remitente, { 
            text: '❌ Opción no válida. Por favor elige un número del 1 al 5.' 
        });
    }
}

function cargarContactosRespondidos() {
    try {
        if (fs.existsSync(CONFIG.archivoRespondidos)) {
            const data = JSON.parse(fs.readFileSync(CONFIG.archivoRespondidos, 'utf8'));
            const ahora = Date.now();
            const activos = {};
            for (const [jid, info] of Object.entries(data)) {
                if (ahora - info.timestamp < 86400000) {
                    activos[jid] = info;
                }
            }
            return activos;
        }
    } catch (err) {
        log.error('Error cargando respondidos: ' + err.message);
    }
    return {};
}

function guardarContactoRespondido(jid) {
    try {
        const respondidos = cargarContactosRespondidos();
        respondidos[jid] = {
            timestamp: Date.now(),
            fecha: new Date().toLocaleString('es-EC')
        };
        fs.writeFileSync(CONFIG.archivoRespondidos, JSON.stringify(respondidos, null, 2));
    } catch (err) {
        log.error('Error guardando respondido: ' + err.message);
    }
}

function esNovia(jid) {
    return CONFIG.numeroNovia.includes(jid);
}

function mantenerPCActiva() {
    if (!CONFIG.mantenerPCDespierta) return;
    
    log.title('CONFIGURANDO SISTEMA ANTI-SUSPENSION');
    
    if (process.platform === 'win32') {
        exec('powercfg /change monitor-timeout-ac 0', (err) => {
            if (err) log.warning('Advertencia: ' + err.message);
            else log.success('Monitor: NO se apagara');
        });
        
        exec('powercfg /change standby-timeout-ac 0', (err) => {
            if (err) log.warning('Advertencia: ' + err.message);
            else log.success('Suspension: DESACTIVADA');
        });
        
        exec('powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c', (err) => {
            if (err) log.warning('Advertencia: ' + err.message);
            else log.success('Alto rendimiento ACTIVADO');
        });
        
        log.success('PC configurada 24/7\n');
    }
    
    keepAliveInterval = setInterval(() => {
        if (process.platform === 'win32') {
            exec('echo keepalive > nul');
        }
    }, CONFIG.intervaloKeepAlive);
}

function restaurarConfiguracionPC() {
    log.info('\nRestaurando configuracion...');
    
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
    
    if (recordatoriosInterval) {
        clearInterval(recordatoriosInterval);
    }
    
    if (process.platform === 'win32') {
        exec('powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e', (err) => {
            if (!err) log.success('Configuracion restaurada');
        });
    }
}

function inicializarDirectorios() {
    [CONFIG.directorioBackup, CONFIG.directorioLogs].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function cargarEstadisticas() {
    try {
        if (fs.existsSync(CONFIG.archivoEstadisticas)) {
            return JSON.parse(fs.readFileSync(CONFIG.archivoEstadisticas, 'utf8'));
        }
    } catch (err) {
        log.error('Error cargando estadisticas: ' + err.message);
    }
    return { eliminadosPorDia: {}, totalEliminados: 0, ultimaLimpieza: null };
}

function guardarEstadisticas(stats) {
    try {
        fs.writeFileSync(CONFIG.archivoEstadisticas, JSON.stringify(stats, null, 2));
    } catch (err) {
        log.error('Error guardando estadisticas: ' + err.message);
    }
}

function cargarUltimosEliminados() {
    try {
        if (fs.existsSync(CONFIG.archivoUltimosEliminados)) {
            return JSON.parse(fs.readFileSync(CONFIG.archivoUltimosEliminados, 'utf8'));
        }
    } catch (err) {}
    return { mensajes: [], timestamp: null };
}

function guardarUltimosEliminados(mensajes) {
    try {
        const data = {
            mensajes: mensajes,
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(CONFIG.archivoUltimosEliminados, JSON.stringify(data, null, 2));
    } catch (err) {}
}

function registrarEnLog(mensaje, chatId, eliminados) {
    const fecha = new Date();
    const nombreArchivo = `log_${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}.txt`;
    const rutaArchivo = path.join(CONFIG.directorioLogs, nombreArchivo);
    
    const timestamp = fecha.toLocaleString('es-EC');
    const linea = `[${timestamp}] Chat: ${chatId} | Eliminados: ${eliminados} | Comando: ${mensaje}\n`;
    
    try {
        fs.appendFileSync(rutaArchivo, linea);
    } catch (err) {}
}

function guardarBackup(mensajes, chatId, comando) {
    const fecha = new Date();
    const timestamp = fecha.getTime();
    const nombreArchivo = `backup_${chatId.replace('@', '_')}_${timestamp}.json`;
    const rutaArchivo = path.join(CONFIG.directorioBackup, nombreArchivo);
    
    const backup = {
        fecha: fecha.toISOString(),
        chatId: chatId,
        comando: comando,
        totalMensajes: mensajes.length,
        mensajes: mensajes.map(msg => ({
            id: msg.key.id,
            timestamp: msg.messageTimestamp,
            fecha: new Date(msg.messageTimestamp * 1000).toLocaleString('es-EC'),
            contenido: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[Multimedia]',
            tieneImagen: !!msg.message?.imageMessage,
            tieneVideo: !!msg.message?.videoMessage,
            tieneAudio: !!msg.message?.audioMessage,
            tieneDocumento: !!msg.message?.documentMessage
        }))
    };
    
    try {
        fs.writeFileSync(rutaArchivo, JSON.stringify(backup, null, 2));
        log.success('Backup guardado: ' + nombreArchivo);
        return nombreArchivo;
    } catch (err) {
        return null;
    }
}

function generarReporteSemanal() {
    const stats = cargarEstadisticas();
    const ahora = new Date();
    const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let totalSemana = 0;
    let diasActivos = 0;
    
    log.title('REPORTE SEMANAL');
    log.info('Periodo: ' + hace7Dias.toLocaleDateString('es-EC') + ' - ' + ahora.toLocaleDateString('es-EC'));
    console.log('');
    
    for (let i = 0; i < 7; i++) {
        const fecha = new Date(ahora.getTime() - i * 24 * 60 * 60 * 1000);
        const claveFecha = fecha.toISOString().split('T')[0];
        const cantidad = stats.eliminadosPorDia[claveFecha] || 0;
        
        if (cantidad > 0) {
            diasActivos++;
            totalSemana += cantidad;
            log.success(fecha.toLocaleDateString('es-EC') + ': ' + cantidad + ' mensajes');
        } else {
            log.dim(fecha.toLocaleDateString('es-EC') + ': 0 mensajes');
        }
    }
    
    console.log('');
    log.data('Total semana: ' + totalSemana);
    log.data('Dias activos: ' + diasActivos);
    log.data('Promedio: ' + (totalSemana / 7).toFixed(1));
    log.data('Total historico: ' + stats.totalEliminados);
    console.log('');
}

function listarBackups() {
    try {
        const archivos = fs.readdirSync(CONFIG.directorioBackup)
            .filter(f => f.startsWith('backup_'))
            .sort()
            .reverse()
            .slice(0, 10);
        
        if (archivos.length === 0) {
            log.warning('No hay backups');
            return;
        }
        
        log.title('ULTIMOS 10 BACKUPS');
        
        archivos.forEach((archivo, index) => {
            const ruta = path.join(CONFIG.directorioBackup, archivo);
            const stats = fs.statSync(ruta);
            const tamano = (stats.size / 1024).toFixed(2);
            log.data((index + 1) + '. ' + archivo + ' (' + tamano + ' KB)');
        });
        
        console.log('');
    } catch (err) {}
}

function listarCitasAgendadas() {
    const citas = cargarCitas();
    
    if (citas.length === 0) {
        log.warning('No hay citas agendadas');
        return;
    }
    
    log.title('CITAS AGENDADAS');
    
    const citasFuturas = citas.filter(c => {
        const [dia, mes, año] = c.fecha.split('/');
        const fechaCita = new Date(año, mes - 1, dia);
        return fechaCita >= new Date();
    });
    
    if (citasFuturas.length === 0) {
        log.warning('No hay citas futuras');
        return;
    }
    
    citasFuturas.forEach((cita, index) => {
        const estado = cita.confirmada ? '✅' : '⏳';
        log.data(`${index + 1}. ${estado} ${cita.tipo.toUpperCase()} - ${cita.fecha} ${cita.hora}`);
        log.dim(`   Contacto: ${cita.jid.substring(0, 20)}...`);
        log.dim(`   Motivo: ${cita.motivo.substring(0, 50)}...`);
        console.log('');
    });
}

function buscarEnBackups(palabra) {
    log.title('BUSCANDO: ' + palabra);
    
    try {
        const archivos = fs.readdirSync(CONFIG.directorioBackup)
            .filter(f => f.startsWith('backup_'))
            .sort()
            .reverse();
        
        let resultados = 0;
        
        for (const archivo of archivos) {
            const ruta = path.join(CONFIG.directorioBackup, archivo);
            const data = JSON.parse(fs.readFileSync(ruta, 'utf8'));
            
            const encontrados = data.mensajes.filter(msg => 
                msg.contenido.toLowerCase().includes(palabra.toLowerCase())
            );
            
            if (encontrados.length > 0) {
                log.success(archivo + ': ' + encontrados.length + ' coincidencias');
                encontrados.slice(0, 2).forEach((msg, i) => {
                    log.dim('  ' + msg.contenido.substring(0, 70));
                });
                resultados += encontrados.length;
            }
        }
        
        log.info('\nTotal: ' + resultados + ' coincidencias\n');
    } catch (err) {}
}

function contarMensajesCache(store, chatId = null) {
    log.title('MENSAJES EN CACHE');
    
    let totalMensajes = 0;
    let totalMios = 0;
    
    if (chatId) {
        if (store.messages[chatId]) {
            const mensajes = store.messages[chatId].array || [];
            const mios = mensajes.filter(m => m.key?.fromMe);
            log.data('Total: ' + mensajes.length);
            log.data('Mios: ' + mios.length);
            totalMensajes = mensajes.length;
            totalMios = mios.length;
        }
    } else {
        for (const [chat, data] of Object.entries(store.messages)) {
            const mensajes = data.array || [];
            const mios = mensajes.filter(m => m.key?.fromMe);
            totalMensajes += mensajes.length;
            totalMios += mios.length;
        }
        log.data('Total: ' + totalMensajes);
        log.data('Mios: ' + totalMios);
    }
    console.log('');
}

function estadisticasChat(store, chatId) {
    log.title('ESTADISTICAS DEL CHAT');
    
    if (!store.messages[chatId]) {
        log.warning('Chat no encontrado\n');
        return;
    }
    
    const mensajes = store.messages[chatId].array || [];
    const mios = mensajes.filter(m => m.key?.fromMe);
    
    let textos = 0, imagenes = 0, videos = 0, audios = 0;
    
    mios.forEach(msg => {
        if (msg.message?.imageMessage) imagenes++;
        else if (msg.message?.videoMessage) videos++;
        else if (msg.message?.audioMessage) audios++;
        else textos++;
    });
    
    log.data('Total: ' + mensajes.length);
    log.data('Mios: ' + mios.length);
    log.data('Textos: ' + textos);
    log.data('Imagenes: ' + imagenes);
    log.data('Videos: ' + videos);
    log.data('Audios: ' + audios);
    console.log('');
}

function contieneEmojis(texto) {
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/u;
    return emojiRegex.test(texto);
}

async function eliminarMensajesConParametros(sock, store, chatId, parametros, preview = false) {
    const { minutos, eliminarFotos } = parametros;
    
    if (preview) {
        log.title('PREVIEW');
        return 0;
    }
    
    log.title('LIMPIEZA DE MENSAJES');
    log.info('Chat: ' + chatId);
    log.info('Tiempo: ' + minutos + ' minutos');
    
    try {
        let mensajes = [];
        
        if (store && store.messages && store.messages[chatId]) {
            mensajes = Array.from(store.messages[chatId].array || []);
        }
        
        if (mensajes.length === 0) {
            log.warning('No hay mensajes\n');
            return 0;
        }
        
        const ahora = Math.floor(Date.now() / 1000);
        const edadMinimaSegundos = minutos * 60;
        let mensajesAEliminar = [];
        let omitidos = 0;
        
        for (const msg of mensajes) {
            if (!msg.key || !msg.key.fromMe) continue;
            
            const timestamp = msg.messageTimestamp || ahora;
            const edadSegundos = ahora - timestamp;
            const edadHoras = edadSegundos / 3600;
            
            if (edadSegundos < edadMinimaSegundos) continue;
            if (edadHoras > CONFIG.tiempoLimiteWhatsApp) {
                omitidos++;
                continue;
            }
            
            const tieneMultimedia = msg.message?.imageMessage || 
                                   msg.message?.videoMessage || 
                                   msg.message?.audioMessage ||
                                   msg.message?.documentMessage;
            
            if (tieneMultimedia && !eliminarFotos) {
                omitidos++;
                continue;
            }
            
            const contenido = msg.message?.conversation || 
                            msg.message?.extendedTextMessage?.text || '';
            
            if (contieneEmojis(contenido) && contenido.length < 10) {
                omitidos++;
                continue;
            }
            
            const tieneProteccion = CONFIG.palabrasProtegidas.some(palabra => 
                contenido.toLowerCase().includes(palabra.toLowerCase())
            );
            
            if (tieneProteccion) {
                omitidos++;
                continue;
            }
            
            mensajesAEliminar.push(msg);
        }
        
        if (mensajesAEliminar.length === 0) {
            log.warning('No hay mensajes para eliminar\n');
            return 0;
        }
        
        guardarUltimosEliminados(mensajesAEliminar.map(msg => ({
            key: msg.key,
            message: msg.message,
            messageTimestamp: msg.messageTimestamp
        })));
        
        const archivoBackup = guardarBackup(mensajesAEliminar, chatId, `${minutos}min`);
        
        let eliminados = 0;
        log.info('Eliminando ' + mensajesAEliminar.length + ' mensajes...');
        
        for (const msg of mensajesAEliminar) {
            try {
                await sock.sendMessage(chatId, { delete: msg.key });
                eliminados++;
                await delay(1500);
            } catch (err) {}
        }
        
        const stats = cargarEstadisticas();
        const hoy = new Date().toISOString().split('T')[0];
        stats.eliminadosPorDia[hoy] = (stats.eliminadosPorDia[hoy] || 0) + eliminados;
        stats.totalEliminados += eliminados;
        stats.ultimaLimpieza = new Date().toISOString();
        guardarEstadisticas(stats);
        
        registrarEnLog(`${minutos}min`, chatId, eliminados);
        
        log.success('Eliminados: ' + eliminados);
        log.data('Omitidos: ' + omitidos);
        console.log('');
        
        return eliminados;
        
    } catch (error) {
        log.error('Error: ' + error.message);
        return 0;
    }
}

async function recuperarUltimosEliminados(sock, chatId) {
    log.title('RECUPERANDO MENSAJES');
    
    const data = cargarUltimosEliminados();
    
    if (!data.mensajes || data.mensajes.length === 0) {
        log.warning('No hay mensajes para recuperar\n');
        return;
    }
    
    const tiempoTranscurrido = new Date() - new Date(data.timestamp);
    const minutosTranscurridos = Math.floor(tiempoTranscurrido / 60000);
    
    if (minutosTranscurridos > 5) {
        log.warning('Mensajes muy antiguos (>5 min)\n');
        return;
    }
    
    log.info('Recuperando ' + data.mensajes.length + ' mensajes...');
    
    let recuperados = 0;
    
    for (const msg of data.mensajes) {
        try {
            const contenido = msg.message?.conversation || 
                            msg.message?.extendedTextMessage?.text || 
                            '[Multimedia]';
            
            if (msg.message?.conversation || msg.message?.extendedTextMessage) {
                await sock.sendMessage(chatId, { text: `[RECUPERADO] ${contenido}` });
                recuperados++;
                await delay(1000);
            }
        } catch (err) {}
    }
    
    log.success('Recuperados: ' + recuperados + '\n');
}

async function iniciarBot() {
    inicializarDirectorios();
    mantenerPCActiva();
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const store = {
        messages: {},
        chats: {}
    };
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        defaultQueryTimeoutMs: 60000,
        getMessage: async (key) => {
            return { conversation: '' };
        },
        logger: pino({ level: 'fatal' }) // Cambiar de 'silent' a 'fatal' para ocultar más logs
    });

    sock.ev.on('creds.update', saveCreds);
    
    iniciarSistemaRecordatorios(sock);
    
    sock.ev.on('messages.upsert', async (m) => {
        const msgs = m.messages;
        for (const msg of msgs) {
            const chatId = msg.key.remoteJid;
            if (!store.messages[chatId]) {
                store.messages[chatId] = { array: [] };
            }
            
            const existe = store.messages[chatId].array.some(m => m.key.id === msg.key.id);
            
            if (!existe) {
                store.messages[chatId].array.push(msg);
            }
            
            if (store.messages[chatId].array.length > 1000) {
                store.messages[chatId].array.sort((a, b) => 
                    (b.messageTimestamp || 0) - (a.messageTimestamp || 0)
                );
                store.messages[chatId].array = store.messages[chatId].array.slice(0, 800);
            }
        }
        
        try {
            const mensaje = msgs[0];
            
            if (!mensaje.message) return;

            const remitente = mensaje.key.remoteJid;
            const esMio = mensaje.key.fromMe;
            
            if (!esMio && CONFIG.autoresponderActivo) {
                const esGrupo = remitente.includes('@g.us');
                const esEstado = remitente.includes('status@broadcast');
                const esMiNumero = remitente === CONFIG.miNumero;
                
                // Solo responder a contactos normales (no grupos, no estados, no yo mismo)
                if (!esGrupo && !esEstado && !esMiNumero) {
                    const respondidos = cargarContactosRespondidos();
                    const estadoConv = obtenerEstadoConversacion(remitente);
                    
                    // Si ya tiene un estado de conversación activo, procesar respuesta
                    if (respondidos[remitente] && estadoConv.estado) {
                        log.info(`[Menu] Detectada respuesta de ${remitente.substring(0, 15)}...`);
                        await procesarMenuInteractivo(sock, mensaje, remitente);
                        return;
                    }
                    
                    if (!respondidos[remitente]) {
                        const contenido = mensaje.message.conversation || 
                                        mensaje.message.extendedTextMessage?.text || '';
                        
                        log.info('[Auto] Mensaje recibido de: ' + remitente.substring(0, 15) + '...');
                        log.info('[Auto] Contenido: ' + contenido.substring(0, 40) + '...');
                        log.info('[Auto] Esperando 1 minuto para responder...');
                        
                        if (!contactosPendientes.has(remitente)) {
                            contactosPendientes.set(remitente, true);
                            
                            setTimeout(async () => {
                                try {
                                    const respondidosActualizados = cargarContactosRespondidos();
                                    
                                    if (!respondidosActualizados[remitente]) {
                                        log.success('[Auto] Enviando menú a ' + remitente.substring(0, 15) + '...');
                                        
                                        await sock.sendPresenceUpdate('composing', remitente);
                                        await delay(3000);
                                        await sock.sendPresenceUpdate('paused', remitente);
                                        
                                        await sock.sendMessage(remitente, { 
                                            text: CONFIG.mensajeAutoresponder 
                                        });
                                        
                                        actualizarEstadoConversacion(remitente, 'inicial');
                                        guardarContactoRespondido(remitente);
                                        log.success('[Auto] ✓ Menú enviado exitosamente\n');
                                        
                                        contactosPendientes.delete(remitente);
                                    } else {
                                        log.dim('[Auto] Ya respondido anteriormente');
                                        contactosPendientes.delete(remitente);
                                    }
                                } catch (err) {
                                    log.error('[Auto] Error: ' + err.message);
                                    contactosPendientes.delete(remitente);
                                }
                            }, CONFIG.tiempoEsperaRespuesta);
                        } else {
                            log.dim('[Auto] Ya tiene respuesta pendiente');
                        }
                    } else {
                        const estadoActual = obtenerEstadoConversacion(remitente);
                        if (estadoActual.estado && estadoActual.estado !== 'inicial') {
                            await procesarMenuInteractivo(sock, mensaje, remitente);
                        } else {
                            log.dim('[Auto] Contacto ya respondido hoy: ' + remitente.substring(0, 15) + '...');
                        }
                    }
                }
            }
            
            if (!esMio) return;
            
            const esNoviaChat = esNovia(remitente);
            
            const contenido = mensaje.message.conversation || 
                            mensaje.message.extendedTextMessage?.text || 
                            '';
            
            const comandoUpper = contenido.trim().toUpperCase();
            const palabras = comandoUpper.split(' ');
            const comando = palabras[0];
            
            if (comando === 'APEXREPORT') {
                log.command('\nAPEXREPORT detectado');
                await delay(1000);
                await sock.sendMessage(remitente, { delete: mensaje.key });
                generarReporteSemanal();
                return;
            }
            
            if (comando === 'APEXBACKUPS') {
                log.command('\nAPEXBACKUPS detectado');
                await delay(1000);
                await sock.sendMessage(remitente, { delete: mensaje.key });
                listarBackups();
                return;
            }
            
            if (comando === 'APEXCITAS') {
                log.command('\nAPEXCITAS detectado');
                await delay(1000);
                await sock.sendMessage(remitente, { delete: mensaje.key });
                listarCitasAgendadas();
                return;
            }
            
            if (comando === 'APEXFIND' && palabras.length > 1) {
                const palabraBuscar = palabras.slice(1).join(' ');
                log.command('\nAPEXFIND: ' + palabraBuscar);
                await delay(1000);
                await sock.sendMessage(remitente, { delete: mensaje.key });
                buscarEnBackups(palabraBuscar);
                return;
            }
            
            if (comando === 'APEXCOUNT') {
                log.command('\nAPEXCOUNT detectado');
                await delay(1000);
                await sock.sendMessage(remitente, { delete: mensaje.key });
                contarMensajesCache(store, esNoviaChat ? remitente : null);
                return;
            }
            
            if (comando === 'APEXSTATS') {
                log.command('\nAPEXSTATS detectado');
                await delay(1000);
                await sock.sendMessage(remitente, { delete: mensaje.key });
                estadisticasChat(store, remitente);
                return;
            }
            
            if (comando === 'APEXUNDO' && esNoviaChat) {
                log.command('\nAPEXUNDO detectado');
                await delay(1000);
                await sock.sendMessage(remitente, { delete: mensaje.key });
                await recuperarUltimosEliminados(sock, remitente);
                return;
            }
            
            if (comando === 'APEXALL' && esNoviaChat) {
                log.command('\nAPEXALL detectado');
                await delay(1000);
                await sock.sendMessage(remitente, { delete: mensaje.key });
                
                for (const chatId of CONFIG.numeroNovia) {
                    await eliminarMensajesConParametros(sock, store, chatId, {
                        minutos: 0,
                        eliminarFotos: false
                    });
                }
                return;
            }
            
            const matchAPEX = comandoUpper.match(/^APEX(\d+)(FOTOS)?(PREVIEW)?$/);
            
            if (matchAPEX && esNoviaChat) {
                const minutos = parseInt(matchAPEX[1]);
                const eliminarFotos = !!matchAPEX[2];
                const esPreview = !!matchAPEX[3];
                
                log.command('\n' + comandoUpper + ' detectado');
                
                await delay(1000);
                await sock.sendMessage(remitente, { delete: mensaje.key });
                await delay(1000);
                
                await eliminarMensajesConParametros(sock, store, remitente, {
                    minutos: minutos,
                    eliminarFotos: eliminarFotos
                }, esPreview);
                
                return;
            }

        } catch (error) {
            log.error('Error: ' + error.message);
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            log.info('\nEscanea QR con WhatsApp:');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            log.warning('Conexion cerrada. Reconectando: ' + shouldReconnect);
            if (shouldReconnect) {
                iniciarBot();
            }
        } else if (connection === 'open') {
            log.title('BOT APEXCODE CONECTADO');
            console.log('');
            
            log.data('Monitoreando: ' + JSON.stringify(CONFIG.numeroNovia));
            log.success('Modo Stealth: TOTAL (no marca como leido)');
            log.success('Auto-responder: MENU INTERACTIVO con opciones');
            log.success('Disponibilidad: En 2 horas');
            
            log.subtitle('\n=== COMANDOS ===');
            log.data('APEX30, APEX60, APEX1    - Elimina mensajes');
            log.data('APEX30FOTOS              - Incluye fotos');
            log.data('APEXALL                  - Limpia todo');
            log.data('APEXREPORT               - Reporte semanal');
            log.data('APEXBACKUPS              - Lista backups');
            log.data('APEXCITAS                - Ver citas agendadas');
            log.data('APEXFIND [palabra]       - Busca en backups');
            log.data('APEXCOUNT                - Cuenta mensajes');
            log.data('APEXSTATS                - Estadisticas');
            log.data('APEXUNDO                 - Recupera eliminados');
            
            log.subtitle('\n=== MENU INTERACTIVO ===');
            log.success('✓ NO abre/lee mensajes');
            log.success('✓ Espera 1 minuto antes de responder');
            log.success('✓ Muestra menu con 5 opciones');
            log.success('✓ Opción 1: Esperar respuesta en 2h');
            log.success('✓ Opción 2: Dejar mensaje');
            log.success('✓ Opción 3: Agendar cita');
            log.success('✓ Opción 4: Agendar videollamada');
            log.success('✓ Opción 5: Salir');
            log.success('✓ Sistema de recordatorios 24h antes');
            
            log.info('\nBot en modo stealth total...\n');
            
            const stats = cargarEstadisticas();
            log.data('Total eliminado: ' + stats.totalEliminados + ' mensajes');
            if (stats.ultimaLimpieza) {
                log.dim('Ultima limpieza: ' + new Date(stats.ultimaLimpieza).toLocaleString('es-EC'));
            }
            
            const citas = cargarCitas();
            log.data('Citas agendadas: ' + citas.length);
            console.log('');
        }
    });
}

process.on('SIGINT', () => {
    log.warning('\nBot detenido por usuario');
    restaurarConfiguracionPC();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log.warning('\nBot detenido (SIGTERM)');
    restaurarConfiguracionPC();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    log.error('ERROR: ' + err.message);
    log.warning('Continuando...\n');
});

process.on('unhandledRejection', (reason) => {
    log.error('PROMESA RECHAZADA: ' + reason);
    log.warning('Continuando...\n');
});

iniciarBot().catch(err => {
    log.error('Error fatal: ' + err.message);
    restaurarConfiguracionPC();
});