const admin = require("firebase-admin");

//──────────────────────────────
// CONEXIÓN A FIREBASE (usando credenciales de servicio)
//──────────────────────────────

const serviceAccount = JSON.parse(
    Buffer
    .from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64")
    .toString("utf8")
);

admin.initializeApp({

    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL

});

const db = admin.database();

//──────────────────────────────
// ACUMULAR VACACIONES SEGÚN FECHA DE INGRESO
//──────────────────────────────
// Misma lógica que en registrarPersonal.js, pero corriendo
// desde un servidor (GitHub Actions) en lugar del navegador.
//──────────────────────────────

async function actualizarVacacionesAcumuladas(){

    const snap = await db.ref("personal").once("value");

    if(!snap.exists()){
        console.log("No hay personal registrado.");
        return;
    }

    const datos = snap.val();
    const hoy = new Date();

    let actualizados = 0;

    for(const id in datos){

        const persona = datos[id];

        if(!persona.fechaIngreso)
            continue;

        const ingreso = new Date(persona.fechaIngreso);
        const diaAniversario = ingreso.getDate();

        // Aún no llega el día del mes en que toca sumar
        if(hoy.getDate() < diaAniversario)
            continue;

        // Evitar sumar en el mismo mes en que fue registrada
        const mismoMesQueIngreso =
            hoy.getFullYear() === ingreso.getFullYear() &&
            hoy.getMonth() === ingreso.getMonth();

        if(mismoMesQueIngreso)
            continue;

        // Ya se actualizó este mismo mes/año
        const yaActualizado =
            persona.ultimoMesActualizado === hoy.getMonth() &&
            persona.ultimoAnioActualizado === hoy.getFullYear();

        if(yaActualizado)
            continue;

        const nuevoSaldo =
            Number(persona.saldoVacaciones || 0) + 1;

        await db.ref("personal/" + id).update({

            saldoVacaciones: nuevoSaldo,
            ultimoMesActualizado: hoy.getMonth(),
            ultimoAnioActualizado: hoy.getFullYear()

        });

        actualizados++;

        console.log(
            `Se sumó 1 día a ${persona.nombre} (nuevo saldo: ${nuevoSaldo})`
        );

    }

    console.log(`Proceso terminado. Personas actualizadas: ${actualizados}`);

}

actualizarVacacionesAcumuladas()
.then(()=>process.exit(0))
.catch((err)=>{

    console.error("Error al actualizar vacaciones:", err);
    process.exit(1);

});