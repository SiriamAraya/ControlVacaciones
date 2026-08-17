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

async function actualizarVacacionesAcumuladas(){

    const snap = await db.ref("personal").once("value");

    if(!snap.exists()){
        console.log("No hay personal registrado.");
        return;
    }

    const datos = snap.val();
    const hoy = new Date();

    console.log(`Fecha ejecución: ${hoy.toISOString()}`);
    console.log(`Mes actual (0-11): ${hoy.getMonth()}, Día: ${hoy.getDate()}`);
    console.log(`Total personas: ${Object.keys(datos).length}`);
    console.log("---");

    let actualizados = 0;
    let omitidos = 0;

    for(const id in datos){

        const persona = datos[id];

        if(!persona.fechaIngreso){
            console.log(`[SALTADO] ${persona.nombre || id}: sin fechaIngreso`);
            omitidos++;
            continue;
        }

        const ingreso = new Date(persona.fechaIngreso);
        const diaAniversario = ingreso.getDate();
        const mesIngreso = ingreso.getMonth();
        const anioIngreso = ingreso.getFullYear();

        if(isNaN(diaAniversario)){
            console.log(`[SALTADO] ${persona.nombre}: fechaIngreso inválida ("${persona.fechaIngreso}")`);
            omitidos++;
            continue;
        }

        if(hoy.getDate() < diaAniversario){
            console.log(`[SALTADO] ${persona.nombre}: hoy (${hoy.getDate()}) < día aniversario (${diaAniversario})`);
            omitidos++;
            continue;
        }

        const mismoMesQueIngreso =
            hoy.getFullYear() === anioIngreso &&
            hoy.getMonth() === mesIngreso;

        if(mismoMesQueIngreso){
            console.log(`[SALTADO] ${persona.nombre}: mismo mes de ingreso (mes ${mesIngreso}/${anioIngreso})`);
            omitidos++;
            continue;
        }

        const yaActualizado =
            persona.ultimoMesActualizado === hoy.getMonth() &&
            persona.ultimoAnioActualizado === hoy.getFullYear();

        if(yaActualizado){
            console.log(`[SALTADO] ${persona.nombre}: ya actualizado este mes (ultimoMes=${persona.ultimoMesActualizado}, ultimoAnio=${persona.ultimoAnioActualizado})`);
            omitidos++;
            continue;
        }

        const saldoActual = Number(persona.saldoVacaciones || 0);
        const nuevoSaldo = saldoActual + 1;

        await db.ref("personal/" + id).update({

            saldoVacaciones: nuevoSaldo,
            ultimoMesActualizado: hoy.getMonth(),
            ultimoAnioActualizado: hoy.getFullYear()

        });

        actualizados++;

        console.log(
            `[ACTUALIZADO] ${persona.nombre}: saldo ${saldoActual} → ${nuevoSaldo} (ingreso: ${persona.fechaIngreso}, aniversario día ${diaAniversario})`
        );

    }

    console.log("---");
    console.log(`Proceso terminado. Actualizados: ${actualizados}, Omitidos: ${omitidos}`);

}

actualizarVacacionesAcumuladas()
.then(()=>process.exit(0))
.catch((err)=>{

    console.error("Error al actualizar vacaciones:", err);
    process.exit(1);

});
