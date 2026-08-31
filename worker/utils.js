// =========================================================
// UTILS.JS
// Funciones auxiliares compartidas por las rutas del Worker
// =========================================================


// =========================================================
// RESPUESTA JSON
// =========================================================

export function json(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(
            data
        ),
        {
            status:
                status,

            headers: {
                "Content-Type":
                    "application/json; charset=utf-8"
            }
        }
    );

}


// =========================================================
// OBTENER SESIÓN
// =========================================================

export async function getSession(
    request,
    env
) {

    const token =
        getCookie(
            request,
            "session"
        );


    if (!token) {

        return null;

    }


    const session =
        await env.DB
            .prepare(
                `SELECT
                    users.id,
                    users.username,
                    users.email,
                    sessions.expires_at
                 FROM sessions
                 INNER JOIN users
                 ON users.id =
                    sessions.user_id
                 WHERE sessions.token = ?
                 LIMIT 1`
            )
            .bind(
                token
            )
            .first();


    if (!session) {

        return null;

    }


    // ---------------------------------------------------------
    // COMPROBAR EXPIRACIÓN
    // ---------------------------------------------------------

    if (
        new Date(
            session.expires_at
        ) <= new Date()
    ) {

        await env.DB
            .prepare(
                `DELETE FROM sessions
                 WHERE token = ?`
            )
            .bind(
                token
            )
            .run();


        return null;

    }


    return session;

}


// =========================================================
// COOKIES
// =========================================================

export function getCookie(
    request,
    name
) {

    const cookieHeader =
        request.headers.get(
            "Cookie"
        );


    if (!cookieHeader) {

        return null;

    }


    const cookies =
        cookieHeader.split(
            ";"
        );


    for (
        const cookie of cookies
    ) {

        const parts =
            cookie
                .trim()
                .split(
                    "="
                );


        if (
            parts[0] === name
        ) {

            return parts
                .slice(1)
                .join(
                    "="
                );

        }

    }


    return null;

}


// =========================================================
// HASH DE CONTRASEÑA
// =========================================================

export async function hashPassword(
    password
) {

    const encoder =
        new TextEncoder();


    const data =
        encoder.encode(
            password
        );


    const hash =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );


    return arrayBufferToHex(
        hash
    );

}


// =========================================================
// VERIFICAR CONTRASEÑA
// =========================================================

export async function verifyPassword(
    password,
    storedHash
) {

    const hash =
        await hashPassword(
            password
        );


    return hash === storedHash;

}


// =========================================================
// ARRAY BUFFER → HEX
// =========================================================

export function arrayBufferToHex(
    buffer
) {

    return Array
        .from(
            new Uint8Array(
                buffer
            )
        )
        .map(
            function(byte) {

                return byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    );

            }
        )
        .join("");

}


// =========================================================
// GENERAR TOKEN DE SESIÓN
// =========================================================

export function generateToken() {

    const bytes =
        new Uint8Array(
            32
        );


    crypto.getRandomValues(
        bytes
    );


    return Array
        .from(
            bytes
        )
        .map(
            function(byte) {

                return byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    );

            }
        )
        .join("");

}


// =========================================================
// ESCAPAR TEXTO PARA XML
// =========================================================

export function escapeXml(
    value
) {

    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&apos;"
        );

}
