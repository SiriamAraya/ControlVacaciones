//──────────────────────────────
// MODO REGISTRAR / EDITAR
//──────────────────────────────

const params = new URLSearchParams(window.location.search);
const idPersona = params.get("id"); // null si es registro nuevo
const modoEdicion = !!idPersona;

//──────────────────────────────
// AJUSTAR INTERFAZ SEGÚN EL MODO
//──────────────────────────────

function activarModoEdicion(){

    document.getElementById("headerIcon")
        .classList.replace("bi-person-plus-fill","bi-pencil-square");

    document.getElementById("headerTitulo").textContent =
        "Editar Personal";

    document.getElementById("headerDescripcion").textContent =
        "Actualiza los datos del colaborador";

    document.getElementById("btnGuardarIcono")
        .classList.replace("bi-check2-circle","bi-arrow-repeat");

    document.getElementById("btnGuardarTexto").textContent =
        "Actualizar Personal";

}

//──────────────────────────────
// CARGAR DATOS EXISTENTES (MODO EDICIÓN)
//──────────────────────────────

async function cargarPersona(id){

    const snap = await window.db
        .ref("personal/" + id)
        .once("value");

    const data = snap.val();

    if(!data){

        Swal.fire(
            "Error",
            "No se encontró la persona a editar.",
            "error"
        ).then(()=>{

            window.location.href = "listaPersonal.html";

        });

        return;

    }

    document.getElementById("nombre").value = data.nombre || "";
    document.getElementById("cedula").value = data.cedula || "";
    document.getElementById("puesto").value = data.puesto || "";
    document.getElementById("correo").value = data.correo || "";
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("direccion").value = data.direccion || "";
    document.getElementById("fechaIngreso").value = data.fechaIngreso || "";
    document.getElementById("saldoVacaciones").value =
        (data.saldoVacaciones ?? "");

}

if(modoEdicion){

    activarModoEdicion();
    cargarPersona(idPersona);

}

//──────────────────────────────
// ACUMULAR VACACIONES SEGÚN FECHA DE INGRESO
//──────────────────────────────
// Por cada mes cumplido desde la fecha de ingreso se suma 1 día
// de vacaciones. Ejemplo: si la persona ingresó el 15 de junio
// de 2018, cada vez que llega el día 15 de un nuevo mes (y aún
// no se le ha sumado el día ese mes) se incrementa el saldo en 1.
//
// Se apoya en los campos "ultimoMesActualizado" y
// "ultimoAnioActualizado" que ya se guardan al crear a la persona,
// para asegurar que el día solo se sume una vez por mes.
//──────────────────────────────

async function actualizarVacacionesAcumuladas(){

    const snap = await window.db
        .ref("personal")
        .once("value");

    if(!snap.exists())
        return;

    const datos = snap.val();

    const hoy = new Date();

    for(const id in datos){

        const persona = datos[id];

        if(!persona.fechaIngreso)
            continue;

        const ingreso = new Date(persona.fechaIngreso);

        // Día del mes en que ingresó (ej: 15)
        const diaAniversario = ingreso.getDate();

        // Aún no llega el día del mes en que toca sumar
        if(hoy.getDate() < diaAniversario)
            continue;

        // Evitar sumar en el mismo mes en que fue registrada
        // (por ejemplo, si ingresó este mes, no se le suma de una vez)
        const mismoMesQueIngreso =
            hoy.getFullYear() === ingreso.getFullYear() &&
            hoy.getMonth() === ingreso.getMonth();

        if(mismoMesQueIngreso)
            continue;

        // Ya se actualizó este mismo mes/año, no volver a sumar
        const yaActualizado =
            persona.ultimoMesActualizado === hoy.getMonth() &&
            persona.ultimoAnioActualizado === hoy.getFullYear();

        if(yaActualizado)
            continue;

        const nuevoSaldo =
            Number(persona.saldoVacaciones || 0) + 1;

        await window.db
            .ref("personal/" + id)
            .update({

                saldoVacaciones: nuevoSaldo,
                ultimoMesActualizado: hoy.getMonth(),
                ultimoAnioActualizado: hoy.getFullYear()

            });

    }

}

// Se ejecuta cada vez que se carga esta página
actualizarVacacionesAcumuladas();

//──────────────────────────────
// VALIDAR CÉDULA DUPLICADA
//──────────────────────────────

function cedulaExiste(cedula, idActual){

    return new Promise((resolve)=>{

        window.db.ref("personal")
        .orderByChild("cedula")
        .equalTo(cedula)
        .once("value",snap=>{

            if(!snap.exists()){

                resolve(false);
                return;

            }

            // Si estamos editando, ignorar el registro actual
            let duplicado = false;

            snap.forEach(child=>{

                if(child.key !== idActual){

                    duplicado = true;

                }

            });

            resolve(duplicado);

        });

    });

}

//──────────────────────────────
// VALIDACIONES
//──────────────────────────────

function validar(
    nombre,
    cedula,
    puesto,
    correo,
    telefono,
    direccion,
    saldoVacaciones,
    fechaIngreso
){

    if(!nombre)
        return "Debe ingresar el nombre.";

    if(!cedula)
        return "Debe ingresar la cédula.";

    if(cedula.length<6)
        return "La cédula no es válida.";

    if(!puesto)
        return "Debe ingresar el puesto u ocupación.";

    if(!correo)
        return "Debe ingresar el correo electrónico.";

    const regexCorreo=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!regexCorreo.test(correo))
        return "El correo electrónico no es válido.";

    if(!telefono)
        return "Debe ingresar el teléfono.";

    if(!direccion)
        return "Debe ingresar la dirección.";

    if(saldoVacaciones==="" || saldoVacaciones<0)
        return "Saldo de vacaciones inválido.";

    if(!fechaIngreso)
        return "Debe seleccionar la fecha de ingreso.";

    return null;

}

//──────────────────────────────
// GUARDAR (REGISTRAR O ACTUALIZAR)
//──────────────────────────────

document.getElementById("formPersonal")
.addEventListener("submit",async function(e){

    e.preventDefault();

    const nombre=
        document.getElementById("nombre").value.trim();

    const cedula=
        document.getElementById("cedula").value.trim();

    const puesto=
        document.getElementById("puesto").value.trim();

    const correo=
        document.getElementById("correo").value.trim().toLowerCase();

    const telefono=
        document.getElementById("telefono").value.trim();

    const direccion=
        document.getElementById("direccion").value.trim();

    const saldoVacaciones=
        parseInt(document.getElementById("saldoVacaciones").value);

    const fechaIngreso=
        document.getElementById("fechaIngreso").value;


    const error=validar(

        nombre,
        cedula,
        puesto,
        correo,
        telefono,
        direccion,
        saldoVacaciones,
        fechaIngreso

    );

    if(error){

        Swal.fire(
            "Error",
            error,
            "error"
        );

        return;

    }

    const existe=await cedulaExiste(cedula, idPersona);

    if(existe){

        Swal.fire(
            "Error",
            "La cédula ya existe.",
            "warning"
        );

        return;

    }

    if(modoEdicion){

        // ─── ACTUALIZAR REGISTRO EXISTENTE ───

        await window.db
        .ref("personal/" + idPersona)
        .update({

            nombre,
            cedula,
            puesto,
            correo,
            telefono,
            direccion,
            fechaIngreso,
            saldoVacaciones

        });

        Swal.fire({

            icon:"success",
            title:"Actualización exitosa",
            text:"Los datos fueron actualizados correctamente."

        }).then(()=>{

            window.location.href = "listaPersonal.html";

        });

    }else{

        // ─── CREAR REGISTRO NUEVO ───

        const hoy=new Date();

        const persona={

            nombre,
            cedula,
            puesto,
            correo,
            telefono,
            direccion,
            fechaIngreso,

            saldoVacaciones,

            ultimoMesActualizado:hoy.getMonth(),

            ultimoAnioActualizado:hoy.getFullYear(),

            fechaRegistro:hoy.toISOString()

        };

        await window.db
        .ref("personal")
        .push(persona);

        Swal.fire({

            icon:"success",
            title:"Registro exitoso",
            text:"La persona fue registrada correctamente."

        });

        document
        .getElementById("formPersonal")
        .reset();

    }

});