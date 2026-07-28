//──────────────────────────────
// VALIDAR CÉDULA DUPLICADA
//──────────────────────────────

function cedulaExiste(cedula){

    return new Promise((resolve)=>{

        window.db.ref("personal")
        .orderByChild("cedula")
        .equalTo(cedula)
        .once("value",snap=>{

            resolve(snap.exists());

        });

    });

}

//──────────────────────────────
// VALIDACIONES
//──────────────────────────────

function validar(
    nombre,
    cedula,
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
// GUARDAR
//──────────────────────────────

document.getElementById("formPersonal")
.addEventListener("submit",async function(e){

    e.preventDefault();

    const nombre=
        document.getElementById("nombre").value.trim();

    const cedula=
        document.getElementById("cedula").value.trim();

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

    const existe=await cedulaExiste(cedula);

    if(existe){

        Swal.fire(
            "Error",
            "La cédula ya existe.",
            "warning"
        );

        return;

    }

    const hoy=new Date();

    const persona={

        nombre,
        cedula,
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

});