
export default {
    async fetch(request, env) {

        const url = new URL(request.url);

        // ==============================
        // API: REGISTRO
        // ==============================
        if (url.pathname === "/api/register" && request.method === "POST") {

            try {

                const data = await request.json();

                const username = String(data.username || "").trim();
                const email = String(data.email || "").trim().toLowerCase();
                const password = String(data.password || "");

                if (!username || !email || !password) {
                    return json({
                        success: false,
                        error: "Todos los campos son obligatorios."
                    }, 400);
                }

                if (username.length < 3) {
                    return json({
                        success: false,
                        error: "El nombre de usuario debe tener al menos 3 caracteres."
                    }, 400);
                }

                if (password.length < 6) {
                    return json({
                        success: false,
                        error: "La contraseña debe tener al menos 6 caracteres."
                    }, 400);
                }

                // Comprobar usuario o email existente
                const existing = await env.DB
                    .prepare(
                        "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1"
                    )
                    .bind(username, email)
                    .first();

                if (existing) {
                    return json({
                        success: false,
                        error: "El usuario o correo electrónico ya está registrado."
                    }, 409);
                }

                // Crear hash de contraseña
                const passwordHash = await hashPassword(password);

                const result = await env.DB
                    .prepare(
                        `INSERT INTO users
                        (username, email, password_hash)
                        VALUES (?, ?, ?)`
                    )
                    .bind(username, email, passwordHash)
                    .run();

                if (!result.success) {
                    return json({
                        success: false,
                        error: "No se pudo crear la cuenta."
                    }, 500);
                }

                return json({
                    success: true,
                    message: "Cuenta creada correctamente."
                });

            } catch (error) {

                return json({
                    success: false,
                    error: error.message
                }, 500);
            }
        }


        // ==============================
        // API: LOGIN
        // ==============================
        if (url.pathname === "/api/login" && request.method === "POST") {

            try {

                const data = await request.json();

                const login = String(data.login || "").trim().toLowerCase();
                const password = String(data.password || "");

                if (!login || !password) {
                    return json({
                        success: false,
                        error: "Completa todos los campos."
                    }, 400);
                }

                const user = await env.DB
                    .prepare(
                        `SELECT id, username, email, password_hash
                         FROM users
                         WHERE LOWER(username) = ? OR LOWER(email) = ?
                         LIMIT 1`
                    )
                    .bind(login, login)
                    .first();

                if (!user) {
                    return json({
                        success: false,
                        error: "Usuario o contraseña incorrectos."
                    }, 401);
                }

                const validPassword = await verifyPassword(
                    password,
                    user.password_hash
                );

                if (!validPassword) {
                    return json({
                        success: false,
                        error: "Usuario o contraseña incorrectos."
                    }, 401);
                }

                // Generar token de sesión
                const token = generateToken();

                // Sesión válida durante 30 días
                const expiresAt = new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString();

                await env.DB
                    .prepare(
                        `INSERT INTO sessions
                        (user_id, token, expires_at)
                        VALUES (?, ?, ?)`
                    )
                    .bind(user.id, token, expiresAt)
                    .run();

                const headers = {
                    "Content-Type": "application/json",
                    "Set-Cookie":
                        `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
                };

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: "Inicio de sesión correcto.",
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email
                        }
                    }),
                    {
                        status: 200,
                        headers
                    }
                );

            } catch (error) {

                return json({
                    success: false,
                    error: error.message
                }, 500);
            }
        }


        // ==============================
        // API: USUARIO ACTUAL
        // ==============================
        if (url.pathname === "/api/me" && request.method === "GET") {

            try {

                const token = getCookie(request, "session");

                if (!token) {
                    return json({
                        success: false,
                        loggedIn: false
                    }, 401);
                }

                const session = await env.DB
                    .prepare(
                        `SELECT
                            users.id,
                            users.username,
                            users.email,
                            sessions.expires_at
                         FROM sessions
                         INNER JOIN users
                         ON users.id = sessions.user_id
                         WHERE sessions.token = ?
                         LIMIT 1`
                    )
                    .bind(token)
                    .first();

                if (!session) {
                    return json({
                        success: false,
                        loggedIn: false
                    }, 401);
                }

                if (new Date(session.expires_at) <= new Date()) {

                    await env.DB
                        .prepare(
                            "DELETE FROM sessions WHERE token = ?"
                        )
                        .bind(token)
                        .run();

                    return json({
                        success: false,
                        loggedIn: false
                    }, 401);
                }

                return json({
                    success: true,
                    loggedIn: true,
                    user: {
                        id: session.id,
                        username: session.username,
                        email: session.email
                    }
                });

            } catch (error) {

                return json({
                    success: false,
                    error: error.message
                }, 500);
            }
        }


        // ==============================
        // API: LOGOUT
        // ==============================
        if (url.pathname === "/api/logout" && request.method === "POST") {

            try {

                const token = getCookie(request, "session");

                if (token) {

                    await env.DB
                        .prepare(
                            "DELETE FROM sessions WHERE token = ?"
                        )
                        .bind(token)
                        .run();
                }

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: "Sesión cerrada."
                    }),
                    {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json",
                            "Set-Cookie":
                                "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
                        }
                    }
                );

            } catch (error) {

                return json({
                    success: false,
                    error: error.message
                }, 500);
            }
        }


        // ==============================
        // API TEST
        // ==============================
        if (url.pathname === "/api/test") {

            try {

                const result = await env.DB
                    .prepare("SELECT 1 AS test")
                    .first();

                return json({
                    success: true,
                    message: "ComicWorldFiles API funcionando.",
                    database: result
                });

            } catch (error) {

                return json({
                    success: false,
                    error: error.message
                }, 500);
            }
        }

        // ==============================
// API: CREAR HISTORIA
// ==============================
if (url.pathname === "/api/stories" && request.method === "POST") {

    try {

        // Obtener sesión
        const token = getCookie(request, "session");

        if (!token) {

            return json({
                success: false,
                error: "Debes iniciar sesión para crear una historia."
            }, 401);

        }


        // Buscar usuario mediante la sesión
        const session = await env.DB
            .prepare(
                `SELECT
                    users.id,
                    users.username,
                    sessions.expires_at
                 FROM sessions
                 INNER JOIN users
                 ON users.id = sessions.user_id
                 WHERE sessions.token = ?
                 LIMIT 1`
            )
            .bind(token)
            .first();


        if (!session) {

            return json({
                success: false,
                error: "La sesión no es válida."
            }, 401);

        }


        // Comprobar expiración
        if (new Date(session.expires_at) <= new Date()) {

            await env.DB
                .prepare(
                    "DELETE FROM sessions WHERE token = ?"
                )
                .bind(token)
                .run();

            return json({
                success: false,
                error: "La sesión ha expirado."
            }, 401);

        }


        // Obtener datos enviados por el formulario
        const data = await request.json();

        const title =
            String(data.title || "").trim();

        const description =
            String(data.description || "").trim();

        const genre =
            String(data.genre || "").trim();


        // Validaciones
        if (!title || !description || !genre) {

            return json({
                success: false,
                error: "Todos los campos son obligatorios."
            }, 400);

        }


        if (title.length < 2) {

            return json({
                success: false,
                error: "El título es demasiado corto."
            }, 400);

        }


        // Guardar historia
        const result = await env.DB
            .prepare(
                `INSERT INTO stories
                (user_id, title, description, genre)
                VALUES (?, ?, ?, ?)`
            )
            .bind(
                session.id,
                title,
                description,
                genre
            )
            .run();


        if (!result.success) {

            return json({
                success: false,
                error: "No se pudo guardar la historia."
            }, 500);

        }


        return json({
            success: true,
            message: "Historia creada correctamente.",
            story: {
                id: result.meta.last_row_id,
                title: title,
                description: description,
                genre: genre,
                author: session.username
            }
        });


    } catch (error) {

        return json({
            success: false,
            error: error.message
        }, 500);

    }
}


        // ==============================
        // ARCHIVOS HTML / ESTÁTICOS
        // ==============================

        return env.ASSETS.fetch(request);
    }
};


// ==========================================
// FUNCIONES
// ==========================================

function json(data, status = 200) {

    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );
}


// ==========================================
// HASH DE CONTRASEÑA
// ==========================================

async function hashPassword(password) {

    const encoder = new TextEncoder();

    const data = encoder.encode(password);

    const hash = await crypto.subtle.digest(
        "SHA-256",
        data
    );

    return arrayBufferToHex(hash);
}


async function verifyPassword(password, storedHash) {

    const hash = await hashPassword(password);

    return hash === storedHash;
}


function arrayBufferToHex(buffer) {

    return Array
        .from(new Uint8Array(buffer))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}


// ==========================================
// TOKEN DE SESIÓN
// ==========================================

function generateToken() {

    const bytes = new Uint8Array(32);

    crypto.getRandomValues(bytes);

    return Array
        .from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}


// ==========================================
// COOKIES
// ==========================================

function getCookie(request, name) {

    const cookieHeader = request.headers.get("Cookie");

    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(";");

    for (const cookie of cookies) {

        const parts = cookie.trim().split("=");

        if (parts[0] === name) {
            return parts.slice(1).join("=");
        }
    }

    return null;
}
