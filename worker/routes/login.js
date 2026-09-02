// =========================================================
// RUTAS DE AUTENTICACIÓN
// =========================================================
//
// POST /api/register
// POST /api/login
// GET  /api/me
// POST /api/logout
// =========================================================

export async function handleLogin(
    request,
    env,
    url,
    getSession,
    json,
    hashPassword,
    verifyPassword,
    generateToken,
    getCookie
) {

    // =====================================================
    // API: REGISTRO
    // POST /api/register
    // =====================================================

    if (
        url.pathname === "/api/register" &&
        request.method === "POST"
    ) {

        try {

            const data =
                await request.json();


            const username =
                String(data.username || "")
                    .trim();


            const email =
                String(data.email || "")
                    .trim()
                    .toLowerCase();


            const password =
                String(data.password || "");


            if (
                !username ||
                !email ||
                !password
            ) {

                return json({
                    success: false,
                    error:
                        "Todos los campos son obligatorios."
                }, 400);

            }


            if (username.length < 3) {

                return json({
                    success: false,
                    error:
                        "El nombre de usuario debe tener al menos 3 caracteres."
                }, 400);

            }


            if (password.length < 6) {

                return json({
                    success: false,
                    error:
                        "La contraseña debe tener al menos 6 caracteres."
                }, 400);

            }


            const existing =
                await env.DB
                    .prepare(
                        `SELECT id
                         FROM users
                         WHERE username = ?
                            OR email = ?
                         LIMIT 1`
                    )
                    .bind(
                        username,
                        email
                    )
                    .first();


            if (existing) {

                return json({
                    success: false,
                    error:
                        "El usuario o correo electrónico ya está registrado."
                }, 409);

            }


            const passwordHash =
                await hashPassword(
                    password
                );


            const result =
                await env.DB
                    .prepare(
                        `INSERT INTO users
                         (
                            username,
                            email,
                            password_hash
                         )
                         VALUES (?, ?, ?)`
                    )
                    .bind(
                        username,
                        email,
                        passwordHash
                    )
                    .run();


            if (!result.success) {

                return json({
                    success: false,
                    error:
                        "No se pudo crear la cuenta."
                }, 500);

            }


            return json({
                success: true,
                message:
                    "Cuenta creada correctamente."
            });


        } catch (error) {

            console.error(
                "Error registrando usuario:",
                error
            );


            return json({
                success: false,
                error: error.message
            }, 500);

        }

    }


    // =====================================================
    // API: LOGIN
    // POST /api/login
    // =====================================================

    if (
        url.pathname === "/api/login" &&
        request.method === "POST"
    ) {

        try {

            const data =
                await request.json();


            const login =
                String(data.login || "")
                    .trim()
                    .toLowerCase();


            const password =
                String(data.password || "");


            if (
                !login ||
                !password
            ) {

                return json({
                    success: false,
                    error:
                        "Completa todos los campos."
                }, 400);

            }


            const user =
                await env.DB
                    .prepare(
                        `SELECT
                            id,
                            username,
                            email,
                            password_hash
                         FROM users
                         WHERE LOWER(username) = ?
                            OR LOWER(email) = ?
                         LIMIT 1`
                    )
                    .bind(
                        login,
                        login
                    )
                    .first();


            if (!user) {

                return json({
                    success: false,
                    error:
                        "Usuario o contraseña incorrectos."
                }, 401);

            }


            const validPassword =
                await verifyPassword(
                    password,
                    user.password_hash
                );


            if (!validPassword) {

                return json({
                    success: false,
                    error:
                        "Usuario o contraseña incorrectos."
                }, 401);

            }


            const token =
                generateToken();


            const expiresAt =
                new Date(
                    Date.now() +
                    30 *
                    24 *
                    60 *
                    60 *
                    1000
                ).toISOString();


            await env.DB
                .prepare(
                    `INSERT INTO sessions
                     (
                        user_id,
                        token,
                        expires_at
                     )
                     VALUES (?, ?, ?)`
                )
                .bind(
                    user.id,
                    token,
                    expiresAt
                )
                .run();


            return new Response(

                JSON.stringify({
                    success: true,

                    message:
                        "Inicio de sesión correcto.",

                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    }
                }),

                {
                    status: 200,

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Set-Cookie":
                            `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
                    }
                }

            );


        } catch (error) {

            console.error(
                "Error iniciando sesión:",
                error
            );


            return json({
                success: false,
                error: error.message
            }, 500);

        }

    }


    // =====================================================
    // API: USUARIO ACTUAL
    // GET /api/me
    // =====================================================

    if (
        url.pathname === "/api/me" &&
        request.method === "GET"
    ) {

        try {

            const session =
                await getSession(
                    request,
                    env
                );


            if (!session) {

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

            console.error(
                "Error obteniendo usuario:",
                error
            );


            return json({
                success: false,
                error: error.message
            }, 500);

        }

    }


    // =====================================================
    // API: LOGOUT
    // POST /api/logout
    // =====================================================

    if (
        url.pathname === "/api/logout" &&
        request.method === "POST"
    ) {

        try {

            const token =
                getCookie(
                    request,
                    "session"
                );


            if (token) {

                await env.DB
                    .prepare(
                        `DELETE FROM sessions
                         WHERE token = ?`
                    )
                    .bind(token)
                    .run();

            }


            return new Response(

                JSON.stringify({
                    success: true,
                    message:
                        "Sesión cerrada."
                }),

                {
                    status: 200,

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Set-Cookie":
                            "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
                    }
                }

            );


        } catch (error) {

            console.error(
                "Error cerrando sesión:",
                error
            );


            return json({
                success: false,
                error: error.message
            }, 500);

        }

    }


    // =====================================================
    // ESTA RUTA NO CORRESPONDE A LOGIN
    // =====================================================

    return null;

}
