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