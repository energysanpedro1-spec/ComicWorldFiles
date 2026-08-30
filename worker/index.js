export default {
    async fetch(request, env) {

        const url = new URL(request.url);


        // =========================================================
        // API: REGISTRO
        // =========================================================

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


                if (
                    username.length < 3
                ) {

                    return json({
                        success: false,
                        error:
                            "El nombre de usuario debe tener al menos 3 caracteres."
                    }, 400);

                }


                if (
                    password.length < 6
                ) {

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


                if (
                    !result.success
                ) {

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
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: LOGIN
        // =========================================================

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
                            id:
                                user.id,

                            username:
                                user.username,

                            email:
                                user.email
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
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: USUARIO ACTUAL
        // GET /api/me
        // =========================================================

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
                        id:
                            session.id,

                        username:
                            session.username,

                        email:
                            session.email
                    }
                });


            } catch (error) {

                console.error(
                    "Error obteniendo usuario:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }

        // =========================================================
        // API: LOGOUT
        // POST /api/logout
        // =========================================================

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
                        .bind(
                            token
                        )
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
                    error:
                        error.message
                }, 500);

            }

        }

        
// =========================================================
// API: COMPROBAR ADMINISTRADOR
//
// GET /api/admin/check
//
// Comprueba si el usuario actualmente conectado
// es el administrador de ComicWorldFiles.
// =========================================================

if (
    url.pathname === "/api/admin/check" &&
    request.method === "GET"
) {

    try {

        const session =
            await getSession(
                request,
                env
            );


        /*
         * No hay sesión iniciada.
         */

        if (!session) {

            return json({

                success: true,

                loggedIn: false,

                isAdmin: false,

                error:
                    "Debes iniciar sesión."

            }, 200);
        }


        /*
         * Comprobar ID y email.
         *
         * Ambos deben coincidir.
         */

        const isAdmin =
            Number(session.id) === 1 &&
            String(
                session.email || ""
            ).toLowerCase() ===
            "josepunkrock.1@gmail.com";


        /*
         * Usuario autenticado pero
         * no administrador.
         */

        if (!isAdmin) {

            return json({

                success: true,

                loggedIn: true,

                isAdmin: false,

                user: {

                    id:
                        session.id,

                    username:
                        session.username,

                    email:
                        session.email

                },

                error:
                    "No tienes permisos de administrador."

            }, 200);
        }


        /*
         * Administrador confirmado.
         */

        return json({

            success: true,

            loggedIn: true,

            isAdmin: true,

            user: {

                id:
                    session.id,

                username:
                    session.username,

                email:
                    session.email

            }

        }, 200);


    } catch (error) {

        console.error(
            "Error comprobando administrador:",
            error
        );


        return json({

            success: false,

            error:
                error.message

        }, 500);

    }

}

// =========================================================
// API: ADMIN - LISTAR PUBLICACIONES
//
// GET /api/admin/stories
//
// Devuelve todas las historias e historietas
// para el panel de administración.
// =========================================================

if (
    url.pathname === "/api/admin/stories" &&
    request.method === "GET"
) {

    try {

        /*
         * Comprobar administrador.
         */

        const session =
            await getSession(
                request,
                env
            );


        /*
         * No hay sesión.
         */

        if (!session) {

            return json({

                success: false,

                error:
                    "Debes iniciar sesión."

            }, 401);
        }


        /*
         * Comprobar ID y email.
         */

        const isAdmin =
            Number(session.id) === 1 &&
            String(
                session.email || ""
            ).toLowerCase() ===
            "josepunkrock.1@gmail.com";


        /*
         * No es administrador.
         */

        if (!isAdmin) {

            return json({

                success: false,

                error:
                    "No tienes permisos de administrador."

            }, 403);
        }


        /*
         * Obtener todas las publicaciones.
         */

        const result =
            await env.DB
                .prepare(
                    `SELECT
                        stories.id,
                        stories.user_id,
                        stories.title,
                        stories.description,
                        stories.genre,
                        stories.type,
                        stories.cover_url,
                        stories.views,
                        stories.created_at,
                        users.username AS author,

                        (
                            SELECT COUNT(*)
                            FROM story_likes
                            WHERE story_likes.story_id =
                                  stories.id
                        ) AS likes_count,

                        (
                            SELECT COUNT(*)
                            FROM story_comments
                            WHERE story_comments.story_id =
                                  stories.id
                        ) AS comments_count

                     FROM stories

                     INNER JOIN users
                     ON users.id = stories.user_id

                     ORDER BY stories.id DESC`
                )
                .all();


        /*
         * Responder.
         */

        return json({

            success: true,

            stories:
                result.results || []

        }, 200);


    } catch (error) {

        console.error(
            "Error listando publicaciones para admin:",
            error
        );


        return json({

            success: false,

            error:
                error.message ||
                "No se pudieron cargar las publicaciones."

        }, 500);

    }

}

// =========================================================
// API: LISTAR AUTORES
//
// GET /api/authors
//
// Devuelve únicamente usuarios que tengan
// al menos una publicación.
// =========================================================

if (
    url.pathname === "/api/authors" &&
    request.method === "GET"
) {

    try {

        const result =
            await env.DB
                .prepare(
                    `SELECT
                        users.id,
                        users.username,
                        COUNT(stories.id) AS publications
                     FROM users
                     INNER JOIN stories
                     ON stories.user_id = users.id
                     GROUP BY
                        users.id,
                        users.username
                     ORDER BY
                        publications DESC,
                        users.username ASC`
                )
                .all();


        return json({

            success: true,

            authors:
                result.results || []

        });


    } catch (error) {

        console.error(
            "Error listando autores:",
            error
        );


        return json({

            success: false,

            error:
                "No se pudieron cargar los autores."

        }, 500);

    }

}

        // =========================================================
        // API TEST
        // GET /api/test
        // =========================================================

        if (
            url.pathname === "/api/test"
        ) {

            try {

                const result =
                    await env.DB
                        .prepare(
                            "SELECT 1 AS test"
                        )
                        .first();


                return json({
                    success: true,

                    message:
                        "ComicWorldFiles API funcionando.",

                    database:
                        result
                });


            } catch (error) {

                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: CREAR HISTORIA / HISTORIETA
        // POST /api/stories
        // =========================================================

        if (
            url.pathname === "/api/stories" &&
            request.method === "POST"
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
                        error:
                            "Debes iniciar sesión para crear una publicación."
                    }, 401);

                }


                const data =
                    await request.json();


                const title =
                    String(
                        data.title || ""
                    ).trim();


                const description =
                    String(
                        data.description || ""
                    ).trim();


                const genre =
                    String(
                        data.genre || ""
                    ).trim();


                let type =
                    String(
                        data.type || "historia"
                    )
                    .trim()
                    .toLowerCase();


                if (
                    type !== "historia" &&
                    type !== "historieta"
                ) {

                    return json({
                        success: false,
                        error:
                            "El tipo de publicación no es válido."
                    }, 400);

                }


                if (
                    !title ||
                    !description ||
                    !genre
                ) {

                    return json({
                        success: false,
                        error:
                            "Todos los campos son obligatorios."
                    }, 400);

                }


                if (
                    title.length < 2
                ) {

                    return json({
                        success: false,
                        error:
                            "El título es demasiado corto."
                    }, 400);

                }


                const result =
                    await env.DB
                        .prepare(
                            `INSERT INTO stories
                             (
                                user_id,
                                title,
                                description,
                                genre,
                                type,
                                views
                             )
                             VALUES (?, ?, ?, ?, ?, 0)`
                        )
                        .bind(
                            session.id,
                            title,
                            description,
                            genre,
                            type
                        )
                        .run();


                if (
                    !result.success
                ) {

                    return json({
                        success: false,
                        error:
                            "No se pudo guardar la publicación."
                    }, 500);

                }


                const storyId =
                    result.meta.last_row_id;


                return json({
                    success: true,

                    message:
                        type === "historieta"
                            ? "Historieta creada correctamente."
                            : "Historia creada correctamente.",

                    story: {
                        id:
                            storyId,

                        title:
                            title,

                        description:
                            description,

                        genre:
                            genre,

                        type:
                            type,

                        views:
                            0,

                        cover_url:
                            null,

                        author:
                            session.username,

                        user_id:
                            session.id
                    }
                });


            } catch (error) {

                console.error(
                    "Error creando publicación:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: REGISTRAR VISITA
        // POST /api/stories/5/view
        // =========================================================

        const storyViewMatch =
            url.pathname.match(
                /^\/api\/stories\/(\d+)\/view$/
            );


        if (
            storyViewMatch &&
            request.method === "POST"
        ) {

            try {

                const storyId =
                    Number(
                        storyViewMatch[1]
                    );


                if (
                    !storyId
                ) {

                    return json({
                        success: false,
                        error:
                            "ID de publicación inválido."
                    }, 400);

                }


                const story =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                views
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return json({
                        success: false,
                        error:
                            "La publicación no existe."
                    }, 404);

                }


                await env.DB
                    .prepare(
                        `UPDATE stories
                         SET views = COALESCE(views, 0) + 1
                         WHERE id = ?`
                    )
                    .bind(
                        storyId
                    )
                    .run();


                const updated =
                    await env.DB
                        .prepare(
                            `SELECT
                                views
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                return json({
                    success: true,

                    views:
                        Number(
                            updated.views || 0
                        )
                });


            } catch (error) {

                console.error(
                    "Error registrando visita:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: EDITAR INFORMACIÓN DE HISTORIA / HISTORIETA
        // PUT /api/stories/5
        // =========================================================

        const editStoryMatch =
            url.pathname.match(
                /^\/api\/stories\/(\d+)$/
            );


        if (
            editStoryMatch &&
            request.method === "PUT"
        ) {

            try {

                const storyId =
                    Number(
                        editStoryMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión."
                    }, 401);

                }


                const story =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                user_id,
                                type
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return json({
                        success: false,
                        error:
                            "La publicación no existe."
                    }, 404);

                }


                if (
                    Number(story.user_id) !==
                    Number(session.id)
                ) {

                    return json({
                        success: false,
                        error:
                            "No tienes permiso para modificar esta publicación."
                    }, 403);

                }


                const data =
                    await request.json();


                const title =
                    String(
                        data.title || ""
                    ).trim();


                const description =
                    String(
                        data.description || ""
                    ).trim();


                const genre =
                    String(
                        data.genre || ""
                    ).trim();


                let type =
                    String(
                        data.type ||
                        story.type ||
                        "historia"
                    )
                    .trim()
                    .toLowerCase();


                if (
                    type !== "historia" &&
                    type !== "historieta"
                ) {

                    return json({
                        success: false,
                        error:
                            "El tipo de publicación no es válido."
                    }, 400);

                }


                if (
                    !title ||
                    !description ||
                    !genre
                ) {

                    return json({
                        success: false,
                        error:
                            "El título, la descripción y el género son obligatorios."
                    }, 400);

                }


                if (
                    title.length < 2
                ) {

                    return json({
                        success: false,
                        error:
                            "El título debe tener al menos 2 caracteres."
                    }, 400);

                }


                const result =
                    await env.DB
                        .prepare(
                            `UPDATE stories
                             SET title = ?,
                                 description = ?,
                                 genre = ?,
                                 type = ?
                             WHERE id = ?`
                        )
                        .bind(
                            title,
                            description,
                            genre,
                            type,
                            storyId
                        )
                        .run();


                if (
                    !result.success
                ) {

                    return json({
                        success: false,
                        error:
                            "No se pudo actualizar la publicación."
                    }, 500);

                }


                return json({
                    success: true,

                    message:
                        "Información actualizada correctamente."
                });


            } catch (error) {

                console.error(
                    "Error editando publicación:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: LISTAR HISTORIAS / HISTORIETAS
        // GET /api/stories
        // =========================================================

        if (
            url.pathname === "/api/stories" &&
            request.method === "GET"
        ) {

            try {

                const result =
                    await env.DB
                        .prepare(
                            `SELECT
                                stories.id,
                                stories.user_id,
                                stories.title,
                                stories.description,
                                stories.genre,
                                stories.type,
                                stories.cover_url,
                                stories.views,
                                stories.created_at,
                                users.username AS author
                             FROM stories
                             INNER JOIN users
                             ON users.id = stories.user_id
                             ORDER BY stories.id DESC
                             LIMIT 20`
                        )
                        .all();


                return json({
                    success: true,

                    stories:
                        result.results
                });


            } catch (error) {

                console.error(
                    "Error listando publicaciones:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: PUBLICACIÓN INDIVIDUAL
        // GET /api/stories/5
        // =========================================================

        const storyMatch =
            url.pathname.match(
                /^\/api\/stories\/(\d+)$/
            );


        if (
            storyMatch &&
            request.method === "GET"
        ) {

            try {

                const storyId =
                    Number(
                        storyMatch[1]
                    );


                const story =
                    await env.DB
                        .prepare(
                            `SELECT
                                stories.id,
                                stories.user_id,
                                stories.title,
                                stories.description,
                                stories.genre,
                                stories.type,
                                stories.cover_url,
                                stories.views,
                                stories.created_at,
                                users.username AS author
                             FROM stories
                             INNER JOIN users
                             ON users.id = stories.user_id
                             WHERE stories.id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return json({
                        success: false,
                        error:
                            "La publicación no existe."
                    }, 404);

                }


                return json({
                    success: true,

                    story:
                        story
                });


            } catch (error) {

                console.error(
                    "Error obteniendo publicación:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: SUBIR / REEMPLAZAR PORTADA
        // POST /api/stories/5/cover
        // =========================================================

        const coverMatch =
            url.pathname.match(
                /^\/api\/stories\/(\d+)\/cover$/
            );


        if (
            coverMatch &&
            request.method === "POST"
        ) {

            try {

                const storyId =
                    Number(
                        coverMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión."
                    }, 401);

                }


                const story =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                user_id,
                                cover_url
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return json({
                        success: false,
                        error:
                            "La historia no existe."
                    }, 404);

                }


                if (
                    Number(story.user_id) !==
                    Number(session.id)
                ) {

                    return json({
                        success: false,
                        error:
                            "No tienes permiso para modificar esta historia."
                    }, 403);

                }


                const formData =
                    await request.formData();


                const file =
                    formData.get(
                        "cover"
                    );


                if (
                    !file ||
                    typeof file === "string"
                ) {

                    return json({
                        success: false,
                        error:
                            "No se recibió ninguna imagen."
                    }, 400);

                }


                const maxSize =
                    5 *
                    1024 *
                    1024;


                if (
                    file.size > maxSize
                ) {

                    return json({
                        success: false,
                        error:
                            "La imagen no puede superar los 5 MB."
                    }, 400);

                }


                const allowedTypes = [
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/gif"
                ];


                if (
                    !allowedTypes.includes(
                        file.type
                    )
                ) {

                    return json({
                        success: false,
                        error:
                            "Formato no permitido. Usa JPG, PNG, WEBP o GIF."
                    }, 400);

                }


                const objectKey =
                    "covers/" +
                    session.id +
                    "/" +
                    storyId;


                await env.Cover.put(
                    objectKey,
                    file.stream(),
                    {
                        httpMetadata: {
                            contentType:
                                file.type,

                            cacheControl:
                                "public, max-age=3600"
                        },

                        customMetadata: {
                            storyId:
                                String(storyId),

                            userId:
                                String(session.id)
                        }
                    }
                );


                const coverUrl =
                    "/api/stories/" +
                    storyId +
                    "/cover";


                await env.DB
                    .prepare(
                        `UPDATE stories
                         SET cover_url = ?
                         WHERE id = ?`
                    )
                    .bind(
                        coverUrl,
                        storyId
                    )
                    .run();


                return json({
                    success: true,

                    message:
                        "Portada subida correctamente.",

                    cover_url:
                        coverUrl
                });


            } catch (error) {

                console.error(
                    "Error subiendo portada:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: SERVIR PORTADA DESDE R2
        // GET /api/stories/5/cover
        // =========================================================

        if (
            coverMatch &&
            request.method === "GET"
        ) {

            try {

                const storyId =
                    Number(
                        coverMatch[1]
                    );


                const story =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                user_id
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return new Response(
                        "Historia no encontrada.",
                        {
                            status: 404
                        }
                    );

                }


                const objectKey =
                    "covers/" +
                    story.user_id +
                    "/" +
                    storyId;


                const object =
                    await env.Cover.get(
                        objectKey
                    );


                if (!object) {

                    return new Response(
                        "Portada no encontrada.",
                        {
                            status: 404
                        }
                    );

                }


                const headers =
                    new Headers();


                object.writeHttpMetadata(
                    headers
                );


                headers.set(
                    "ETag",
                    object.httpEtag
                );


                headers.set(
                    "Cache-Control",
                    "public, max-age=3600"
                );


                return new Response(
                    object.body,
                    {
                        status: 200,
                        headers:
                            headers
                    }
                );


            } catch (error) {

                console.error(
                    "Error sirviendo portada:",
                    error
                );


                return new Response(
                    "Error obteniendo portada.",
                    {
                        status: 500
                    }
                );

            }

        }



        // =========================================================
        // API: CAPÍTULOS DE UNA PUBLICACIÓN
        // GET /api/stories/5/chapters
        // POST /api/stories/5/chapters
        // =========================================================

        const chaptersMatch =
            url.pathname.match(
                /^\/api\/stories\/(\d+)\/chapters$/
            );


        if (
            chaptersMatch &&
            request.method === "GET"
        ) {

            try {

                const storyId =
                    Number(
                        chaptersMatch[1]
                    );


                const story =
                    await env.DB
                        .prepare(
                            `SELECT id
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return json({
                        success: false,
                        error:
                            "La historia no existe."
                    }, 404);

                }


                const result =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                story_id,
                                chapter_number,
                                title,
                                content,
                                created_at
                             FROM chapters
                             WHERE story_id = ?
                             ORDER BY chapter_number ASC`
                        )
                        .bind(
                            storyId
                        )
                        .all();


                return json({
                    success: true,

                    chapters:
                        result.results
                });


            } catch (error) {

                console.error(
                    "Error listando capítulos:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // CREAR CAPÍTULO
        // =========================================================

        if (
            chaptersMatch &&
            request.method === "POST"
        ) {

            try {

                const storyId =
                    Number(
                        chaptersMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión."
                    }, 401);

                }


                const story =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                user_id
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return json({
                        success: false,
                        error:
                            "La historia no existe."
                    }, 404);

                }


                if (
                    Number(story.user_id) !==
                    Number(session.id)
                ) {

                    return json({
                        success: false,
                        error:
                            "No tienes permiso para modificar esta historia."
                    }, 403);

                }


                const data =
                    await request.json();


                const title =
                    String(
                        data.title || ""
                    ).trim();


                let content =
                    data.content;


                if (
                    content === undefined ||
                    content === null
                ) {

                    content =
                        [];

                }


                if (
                    typeof content === "string"
                ) {

                    content =
                        content.trim();

                }


                if (
                    Array.isArray(content)
                ) {

                    content =
                        JSON.stringify(
                            content
                        );

                }


                if (
                    !title
                ) {

                    return json({
                        success: false,
                        error:
                            "El título del capítulo es obligatorio."
                    }, 400);

                }


                if (
                    !content
                ) {

                    content =
                        "[]";

                }


                const lastChapter =
                    await env.DB
                        .prepare(
                            `SELECT
                                chapter_number
                             FROM chapters
                             WHERE story_id = ?
                             ORDER BY chapter_number DESC
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                const chapterNumber =
                    lastChapter
                        ? Number(
                            lastChapter.chapter_number
                        ) + 1
                        : 1;


                const result =
                    await env.DB
                        .prepare(
                            `INSERT INTO chapters
                             (
                                story_id,
                                chapter_number,
                                title,
                                content
                             )
                             VALUES (?, ?, ?, ?)`
                        )
                        .bind(
                            storyId,
                            chapterNumber,
                            title,
                            content
                        )
                        .run();


                if (
                    !result.success
                ) {

                    return json({
                        success: false,
                        error:
                            "No se pudo guardar el capítulo."
                    }, 500);

                }


                return json({
                    success: true,

                    message:
                        "Capítulo creado correctamente.",

                    chapter: {
                        id:
                            result.meta.last_row_id,

                        story_id:
                            storyId,

                        chapter_number:
                            chapterNumber,

                        title:
                            title,

                        content:
                            content
                    }
                });


            } catch (error) {

                console.error(
                    "Error creando capítulo:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: CAPÍTULO INDIVIDUAL
        // GET    /api/chapters/10
        // PUT    /api/chapters/10
        // DELETE /api/chapters/10
        // =========================================================

        const chapterMatch =
            url.pathname.match(
                /^\/api\/chapters\/(\d+)$/
            );


        if (
            chapterMatch &&
            request.method === "GET"
        ) {

            try {

                const chapterId =
                    Number(
                        chapterMatch[1]
                    );


                const chapter =
                    await env.DB
                        .prepare(
                            `SELECT
                                chapters.id,
                                chapters.story_id,
                                chapters.chapter_number,
                                chapters.title,
                                chapters.content,
                                chapters.created_at
                             FROM chapters
                             WHERE chapters.id = ?
                             LIMIT 1`
                        )
                        .bind(
                            chapterId
                        )
                        .first();


                if (!chapter) {

                    return json({
                        success: false,
                        error:
                            "El capítulo no existe."
                    }, 404);

                }


                return json({
                    success: true,

                    chapter:
                        chapter
                });


            } catch (error) {

                console.error(
                    "Error obteniendo capítulo:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // EDITAR CAPÍTULO
        // =========================================================

        if (
            chapterMatch &&
            request.method === "PUT"
        ) {

            try {

                const chapterId =
                    Number(
                        chapterMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión."
                    }, 401);

                }


                const chapter =
                    await env.DB
                        .prepare(
                            `SELECT
                                chapters.id,
                                chapters.story_id,
                                stories.user_id
                             FROM chapters
                             INNER JOIN stories
                             ON stories.id =
                                chapters.story_id
                             WHERE chapters.id = ?
                             LIMIT 1`
                        )
                        .bind(
                            chapterId
                        )
                        .first();


                if (!chapter) {

                    return json({
                        success: false,
                        error:
                            "El capítulo no existe."
                    }, 404);

                }


                if (
                    Number(chapter.user_id) !==
                    Number(session.id)
                ) {

                    return json({
                        success: false,
                        error:
                            "No tienes permiso para editar este capítulo."
                    }, 403);

                }


                const data =
                    await request.json();


                const title =
                    String(
                        data.title || ""
                    ).trim();


                let content =
                    data.content;


                if (
                    Array.isArray(content)
                ) {

                    content =
                        JSON.stringify(
                            content
                        );

                }


                if (
                    typeof content !== "string"
                ) {

                    content =
                        "[]";

                }


                if (!title) {

                    return json({
                        success: false,
                        error:
                            "El título del capítulo es obligatorio."
                    }, 400);

                }


                if (
                    !content.trim()
                ) {

                    content =
                        "[]";

                }


                const result =
                    await env.DB
                        .prepare(
                            `UPDATE chapters
                             SET title = ?,
                                 content = ?
                             WHERE id = ?`
                        )
                        .bind(
                            title,
                            content,
                            chapterId
                        )
                        .run();


                if (
                    !result.success
                ) {

                    return json({
                        success: false,
                        error:
                            "No se pudo actualizar el capítulo."
                    }, 500);

                }


                return json({
                    success: true,

                    message:
                        "Capítulo actualizado correctamente."
                });


            } catch (error) {

                console.error(
                    "Error editando capítulo:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // ELIMINAR CAPÍTULO
        // =========================================================

        if (
            chapterMatch &&
            request.method === "DELETE"
        ) {

            try {

                const chapterId =
                    Number(
                        chapterMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión."
                    }, 401);

                }


                const chapter =
                    await env.DB
                        .prepare(
                            `SELECT
                                chapters.id,
                                chapters.story_id,
                                stories.user_id
                             FROM chapters
                             INNER JOIN stories
                             ON stories.id =
                                chapters.story_id
                             WHERE chapters.id = ?
                             LIMIT 1`
                        )
                        .bind(
                            chapterId
                        )
                        .first();


                if (!chapter) {

                    return json({
                        success: false,
                        error:
                            "El capítulo no existe."
                    }, 404);

                }


                if (
                    Number(chapter.user_id) !==
                    Number(session.id)
                ) {

                    return json({
                        success: false,
                        error:
                            "No tienes permiso para eliminar este capítulo."
                    }, 403);

                }


                const images =
                    await env.DB
                        .prepare(
                            `SELECT
                                object_key
                             FROM chapter_images
                             WHERE chapter_id = ?`
                        )
                        .bind(
                            chapterId
                        )
                        .all();


                for (
                    const image of images.results
                ) {

                    try {

                        await env.Images.delete(
                            image.object_key
                        );

                    } catch (error) {

                        console.error(
                            "Error eliminando imagen de R2:",
                            error
                        );

                    }

                }


                await env.DB
                    .prepare(
                        `DELETE FROM chapter_images
                         WHERE chapter_id = ?`
                    )
                    .bind(
                        chapterId
                    )
                    .run();


                const result =
                    await env.DB
                        .prepare(
                            `DELETE FROM chapters
                             WHERE id = ?`
                        )
                        .bind(
                            chapterId
                        )
                        .run();


                if (
                    !result.success
                ) {

                    return json({
                        success: false,
                        error:
                            "No se pudo eliminar el capítulo."
                    }, 500);

                }


                return json({
                    success: true,

                    message:
                        "Capítulo eliminado correctamente."
                });


            } catch (error) {

                console.error(
                    "Error eliminando capítulo:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: GUARDAR CONTENIDO ORDENADO DEL CAPÍTULO
        // PUT /api/chapters/10/content
        // =========================================================

        const chapterContentMatch =
            url.pathname.match(
                /^\/api\/chapters\/(\d+)\/content$/
            );


        if (
            chapterContentMatch &&
            request.method === "PUT"
        ) {

            try {

                const chapterId =
                    Number(
                        chapterContentMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión."
                    }, 401);

                }


                const chapter =
                    await env.DB
                        .prepare(
                            `SELECT
                                chapters.id,
                                chapters.story_id,
                                stories.user_id
                             FROM chapters
                             INNER JOIN stories
                             ON stories.id =
                                chapters.story_id
                             WHERE chapters.id = ?
                             LIMIT 1`
                        )
                        .bind(
                            chapterId
                        )
                        .first();


                if (!chapter) {

                    return json({
                        success: false,
                        error:
                            "El capítulo no existe."
                    }, 404);

                }


                if (
                    Number(chapter.user_id) !==
                    Number(session.id)
                ) {

                    return json({
                        success: false,
                        error:
                            "No tienes permiso para modificar este capítulo."
                    }, 403);

                }


                const data =
                    await request.json();


                const content =
                    data.content;


                if (
                    !Array.isArray(content)
                ) {

                    return json({
                        success: false,
                        error:
                            "El contenido debe ser una lista de elementos."
                    }, 400);

                }


                const cleanContent = [];


                for (
                    const item of content
                ) {

                    if (
                        !item ||
                        !item.type
                    ) {

                        continue;

                    }


                    if (
                        item.type === "text"
                    ) {

                        const text =
                            String(
                                item.content ||
                                item.text ||
                                ""
                            ).trim();


                        if (text) {

                            cleanContent.push({

                                type:
                                    "text",

                                content:
                                    text,

                                text:
                                    text

                            });

                        }

                    }


                    else if (
                        item.type === "image"
                    ) {

                        const imageId =
                            Number(
                                item.image_id
                            );


                        if (
                            !imageId
                        ) {

                            continue;

                        }


                        const image =
                            await env.DB
                                .prepare(
                                    `SELECT
                                        id,
                                        image_url,
                                        filename
                                     FROM chapter_images
                                     WHERE id = ?
                                       AND chapter_id = ?
                                     LIMIT 1`
                                )
                                .bind(
                                    imageId,
                                    chapterId
                                )
                                .first();


                        if (image) {

                            cleanContent.push({

                                type:
                                    "image",

                                image_id:
                                    imageId,

                                image_url:
                                    image.image_url,

                                filename:
                                    image.filename

                            });

                        }

                    }

                }


                const contentJSON =
                    JSON.stringify(
                        cleanContent
                    );


                const result =
                    await env.DB
                        .prepare(
                            `UPDATE chapters
                             SET content = ?
                             WHERE id = ?`
                        )
                        .bind(
                            contentJSON,
                            chapterId
                        )
                        .run();


                if (
                    !result.success
                ) {

                    return json({
                        success: false,
                        error:
                            "No se pudo guardar el contenido."
                    }, 500);

                }


                return json({

                    success:
                        true,

                    message:
                        "Contenido guardado correctamente.",

                    content:
                        cleanContent

                });


            } catch (error) {

                console.error(
                    "Error guardando contenido del capítulo:",
                    error
                );


                return json({

                    success:
                        false,

                    error:
                        error.message

                }, 500);

            }

        }



        // =========================================================
        // API: IMÁGENES DE CAPÍTULO
        // GET  /api/chapters/10/images
        // POST /api/chapters/10/images
        // =========================================================

        const chapterImagesMatch =
            url.pathname.match(
                /^\/api\/chapters\/(\d+)\/images$/
            );


        if (
            chapterImagesMatch &&
            request.method === "GET"
        ) {

            try {

                const chapterId =
                    Number(
                        chapterImagesMatch[1]
                    );


                const chapter =
                    await env.DB
                        .prepare(
                            `SELECT id
                             FROM chapters
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            chapterId
                        )
                        .first();


                if (!chapter) {

                    return json({
                        success: false,
                        error:
                            "El capítulo no existe."
                    }, 404);

                }


                const result =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                chapter_id,
                                image_url,
                                filename,
                                created_at
                             FROM chapter_images
                             WHERE chapter_id = ?
                             ORDER BY id ASC`
                        )
                        .bind(
                            chapterId
                        )
                        .all();


                return json({
                    success: true,

                    images:
                        result.results
                });


            } catch (error) {

                console.error(
                    "Error listando imágenes:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // SUBIR IMAGEN
        // =========================================================

        if (
            chapterImagesMatch &&
            request.method === "POST"
        ) {

            try {

                const chapterId =
                    Number(
                        chapterImagesMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión."
                    }, 401);

                }


                const chapter =
                    await env.DB
                        .prepare(
                            `SELECT
                                chapters.id,
                                chapters.story_id,
                                stories.user_id
                             FROM chapters
                             INNER JOIN stories
                             ON stories.id =
                                chapters.story_id
                             WHERE chapters.id = ?
                             LIMIT 1`
                        )
                        .bind(
                            chapterId
                        )
                        .first();


                if (!chapter) {

                    return json({
                        success: false,
                        error:
                            "El capítulo no existe."
                    }, 404);

                }


                if (
                    Number(chapter.user_id) !==
                    Number(session.id)
                ) {

                    return json({
                        success: false,
                        error:
                            "No tienes permiso para modificar este capítulo."
                    }, 403);

                }


                const formData =
                    await request.formData();


                const file =
                    formData.get(
                        "image"
                    );


                if (
                    !file ||
                    typeof file === "string"
                ) {

                    return json({
                        success: false,
                        error:
                            "No se recibió ninguna imagen."
                    }, 400);

                }


                const maxSize =
                    10 *
                    1024 *
                    1024;


                if (
                    file.size > maxSize
                ) {

                    return json({
                        success: false,
                        error:
                            "La imagen no puede superar los 10 MB."
                    }, 400);

                }


                const allowedTypes = [
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/gif"
                ];


                if (
                    !allowedTypes.includes(
                        file.type
                    )
                ) {

                    return json({
                        success: false,
                        error:
                            "Formato no permitido. Usa JPG, PNG, WEBP o GIF."
                    }, 400);

                }


                let extension =
                    "jpg";


                if (
                    file.type ===
                    "image/png"
                ) {

                    extension =
                        "png";

                }


                if (
                    file.type ===
                    "image/webp"
                ) {

                    extension =
                        "webp";

                }


                if (
                    file.type ===
                    "image/gif"
                ) {

                    extension =
                        "gif";

                }


                const uniqueId =
                    crypto.randomUUID();


                const objectKey =
                    "chapters/" +
                    session.id +
                    "/" +
                    chapterId +
                    "/" +
                    uniqueId +
                    "." +
                    extension;


                await env.Images.put(
                    objectKey,
                    file.stream(),
                    {
                        httpMetadata: {
                            contentType:
                                file.type,

                            cacheControl:
                                "public, max-age=3600"
                        },

                        customMetadata: {
                            chapterId:
                                String(chapterId),

                            userId:
                                String(session.id)
                        }
                    }
                );


                const result =
                    await env.DB
                        .prepare(
                            `INSERT INTO chapter_images
                             (
                                chapter_id,
                                image_url,
                                object_key,
                                filename
                             )
                             VALUES (?, ?, ?, ?)`
                        )
                        .bind(
                            chapterId,

                            "",

                            objectKey,

                            file.name ||
                                "imagen"
                        )
                        .run();


                if (
                    !result.success
                ) {

                    await env.Images.delete(
                        objectKey
                    );


                    return json({
                        success: false,
                        error:
                            "No se pudo registrar la imagen."
                    }, 500);

                }


                const imageId =
                    result.meta.last_row_id;


                const imageUrl =
                    "/api/chapter-images/" +
                    imageId;


                await env.DB
                    .prepare(
                        `UPDATE chapter_images
                         SET image_url = ?
                         WHERE id = ?`
                    )
                    .bind(
                        imageUrl,
                        imageId
                    )
                    .run();


                return json({
                    success: true,

                    message:
                        "Imagen subida correctamente.",

                    image: {
                        id:
                            imageId,

                        chapter_id:
                            chapterId,

                        image_url:
                            imageUrl,

                        filename:
                            file.name ||
                                "imagen"
                    }
                });


            } catch (error) {

                console.error(
                    "Error subiendo imagen:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: IMAGEN INDIVIDUAL
        // GET    /api/chapter-images/123
        // DELETE /api/chapter-images/123
        // =========================================================

        const chapterImageMatch =
            url.pathname.match(
                /^\/api\/chapter-images\/(\d+)$/
            );


        if (
            chapterImageMatch &&
            request.method === "GET"
        ) {

            try {

                const imageId =
                    Number(
                        chapterImageMatch[1]
                    );


                const image =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                object_key
                             FROM chapter_images
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            imageId
                        )
                        .first();


                if (!image) {

                    return new Response(
                        "Imagen no encontrada.",
                        {
                            status: 404
                        }
                    );

                }


                const object =
                    await env.Images.get(
                        image.object_key
                    );


                if (!object) {

                    return new Response(
                        "Archivo no encontrado.",
                        {
                            status: 404
                        }
                    );

                }


                const headers =
                    new Headers();


                object.writeHttpMetadata(
                    headers
                );


                headers.set(
                    "ETag",
                    object.httpEtag
                );


                headers.set(
                    "Cache-Control",
                    "public, max-age=3600"
                );


                return new Response(
                    object.body,
                    {
                        status: 200,
                        headers:
                            headers
                    }
                );


            } catch (error) {

                console.error(
                    "Error sirviendo imagen:",
                    error
                );


                return new Response(
                    "Error obteniendo imagen.",
                    {
                        status: 500
                    }
                );

            }

        }



        // =========================================================
        // ELIMINAR IMAGEN
        // =========================================================

        if (
            chapterImageMatch &&
            request.method === "DELETE"
        ) {

            try {

                const imageId =
                    Number(
                        chapterImageMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión."
                    }, 401);

                }


                const image =
                    await env.DB
                        .prepare(
                            `SELECT
                                chapter_images.id,
                                chapter_images.object_key,
                                chapters.id AS chapter_id,
                                stories.user_id
                             FROM chapter_images
                             INNER JOIN chapters
                             ON chapters.id =
                                chapter_images.chapter_id
                             INNER JOIN stories
                             ON stories.id =
                                chapters.story_id
                             WHERE chapter_images.id = ?
                             LIMIT 1`
                        )
                        .bind(
                            imageId
                        )
                        .first();


                if (!image) {

                    return json({
                        success: false,
                        error:
                            "La imagen no existe."
                    }, 404);

                }


                if (
                    Number(image.user_id) !==
                    Number(session.id)
                ) {

                    return json({
                        success: false,
                        error:
                            "No tienes permiso para eliminar esta imagen."
                    }, 403);

                }


                await env.Images.delete(
                    image.object_key
                );


                const result =
                    await env.DB
                        .prepare(
                            `DELETE FROM chapter_images
                             WHERE id = ?`
                        )
                        .bind(
                            imageId
                        )
                        .run();


                if (
                    !result.success
                ) {

                    return json({
                        success: false,
                        error:
                            "No se pudo eliminar el registro de la imagen."
                    }, 500);

                }


                try {

                    const currentChapter =
                        await env.DB
                            .prepare(
                                `SELECT
                                    content
                                 FROM chapters
                                 WHERE id = ?
                                 LIMIT 1`
                            )
                            .bind(
                                image.chapter_id
                            )
                            .first();


                    if (
                        currentChapter &&
                        currentChapter.content
                    ) {

                        let blocks = [];


                        try {

                            blocks =
                                JSON.parse(
                                    currentChapter.content
                                );

                        } catch (
                            parseError
                        ) {

                            blocks =
                                [];

                        }


                        if (
                            Array.isArray(
                                blocks
                            )
                        ) {

                            blocks =
                                blocks.filter(
                                    function(block) {

                                        return !(
                                            block &&
                                            block.type ===
                                                "image" &&
                                            Number(
                                                block.image_id
                                            ) ===
                                                imageId
                                        );

                                    }
                                );


                            await env.DB
                                .prepare(
                                    `UPDATE chapters
                                     SET content = ?
                                     WHERE id = ?`
                                )
                                .bind(
                                    JSON.stringify(
                                        blocks
                                    ),
                                    image.chapter_id
                                )
                                .run();

                        }

                    }

                } catch (
                    cleanupError
                ) {

                    console.error(
                        "Error limpiando imagen del contenido:",
                        cleanupError
                    );

                }


                return json({
                    success: true,

                    message:
                        "Imagen eliminada correctamente."
                });


            } catch (error) {

                console.error(
                    "Error eliminando imagen:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: ME GUSTA
        //
        // POST /api/stories/5/like
        // GET  /api/stories/5/like
        // =========================================================

        const storyLikeMatch =
            url.pathname.match(
                /^\/api\/stories\/(\d+)\/like$/
            );


        if (
            storyLikeMatch &&
            request.method === "POST"
        ) {

            try {

                const storyId =
                    Number(
                        storyLikeMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión para dar Me gusta."
                    }, 401);

                }


                const story =
                    await env.DB
                        .prepare(
                            `SELECT id
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return json({
                        success: false,
                        error:
                            "La publicación no existe."
                    }, 404);

                }


                const existingLike =
                    await env.DB
                        .prepare(
                            `SELECT id
                             FROM story_likes
                             WHERE story_id = ?
                               AND user_id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId,
                            session.id
                        )
                        .first();


                let liked;


                if (existingLike) {

                    await env.DB
                        .prepare(
                            `DELETE FROM story_likes
                             WHERE story_id = ?
                               AND user_id = ?`
                        )
                        .bind(
                            storyId,
                            session.id
                        )
                        .run();


                    liked = false;

                } else {

                    await env.DB
                        .prepare(
                            `INSERT INTO story_likes
                             (
                                story_id,
                                user_id
                             )
                             VALUES (?, ?)`
                        )
                        .bind(
                            storyId,
                            session.id
                        )
                        .run();


                    liked = true;

                }


                const count =
                    await env.DB
                        .prepare(
                            `SELECT COUNT(*) AS total
                             FROM story_likes
                             WHERE story_id = ?`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                return json({

                    success:
                        true,

                    liked:
                        liked,

                    likes:
                        Number(
                            count.total || 0
                        )

                });


            } catch (error) {

                console.error(
                    "Error procesando Me gusta:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }


        if (
            storyLikeMatch &&
            request.method === "GET"
        ) {

            try {

                const storyId =
                    Number(
                        storyLikeMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                let liked = false;


                if (session) {

                    const existingLike =
                        await env.DB
                            .prepare(
                                `SELECT id
                                 FROM story_likes
                                 WHERE story_id = ?
                                   AND user_id = ?
                                 LIMIT 1`
                            )
                            .bind(
                                storyId,
                                session.id
                            )
                            .first();


                    liked =
                        !!existingLike;

                }


                const count =
                    await env.DB
                        .prepare(
                            `SELECT COUNT(*) AS total
                             FROM story_likes
                             WHERE story_id = ?`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                return json({

                    success:
                        true,

                    liked:
                        liked,

                    likes:
                        Number(
                            count.total || 0
                        )

                });


            } catch (error) {

                console.error(
                    "Error obteniendo Me gusta:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: FAVORITOS
        //
        // POST /api/stories/5/favorite
        // GET  /api/stories/5/favorite
        //
        // POST alterna:
        // favorito -> quitar
        // no favorito -> agregar
        // =========================================================

        const storyFavoriteMatch =
            url.pathname.match(
                /^\/api\/stories\/(\d+)\/favorite$/
            );


        // ---------------------------------------------------------
        // AGREGAR / QUITAR FAVORITO
        // ---------------------------------------------------------

        if (
            storyFavoriteMatch &&
            request.method === "POST"
        ) {

            try {

                const storyId =
                    Number(
                        storyFavoriteMatch[1]
                    );


                if (
                    !storyId
                ) {

                    return json({
                        success: false,
                        error:
                            "ID de publicación inválido."
                    }, 400);

                }


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión para agregar favoritos."
                    }, 401);

                }


                const story =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                title,
                                type
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return json({
                        success: false,
                        error:
                            "La publicación no existe."
                    }, 404);

                }


                const existingFavorite =
                    await env.DB
                        .prepare(
                            `SELECT
                                id
                             FROM story_favorites
                             WHERE story_id = ?
                               AND user_id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId,
                            session.id
                        )
                        .first();


                let favorited;


                // -------------------------------------------------
                // QUITAR DE FAVORITOS
                // -------------------------------------------------

                if (
                    existingFavorite
                ) {

                    await env.DB
                        .prepare(
                            `DELETE FROM story_favorites
                             WHERE story_id = ?
                               AND user_id = ?`
                        )
                        .bind(
                            storyId,
                            session.id
                        )
                        .run();


                    favorited =
                        false;

                }


                // -------------------------------------------------
                // AGREGAR A FAVORITOS
                // -------------------------------------------------

                else {

                    try {

                        await env.DB
                            .prepare(
                                `INSERT INTO story_favorites
                                 (
                                    story_id,
                                    user_id
                                 )
                                 VALUES (?, ?)`
                            )
                            .bind(
                                storyId,
                                session.id
                            )
                            .run();


                        favorited =
                            true;

                    } catch (insertError) {

                        /*
                         * Si la tabla tiene UNIQUE(story_id,user_id)
                         * y otra petición creó el favorito al mismo
                         * tiempo, volvemos a consultar.
                         */

                        const favoriteAfterError =
                            await env.DB
                                .prepare(
                                    `SELECT id
                                     FROM story_favorites
                                     WHERE story_id = ?
                                       AND user_id = ?
                                     LIMIT 1`
                                )
                                .bind(
                                    storyId,
                                    session.id
                                )
                                .first();


                        if (
                            favoriteAfterError
                        ) {

                            favorited =
                                true;

                        } else {

                            throw insertError;

                        }

                    }

                }


                const count =
                    await env.DB
                        .prepare(
                            `SELECT
                                COUNT(*) AS total
                             FROM story_favorites
                             WHERE story_id = ?`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                return json({

                    success:
                        true,

                    favorited:
                        favorited,

                    favorites:
                        Number(
                            count.total || 0
                        )

                });


            } catch (error) {

                console.error(
                    "Error procesando Favorito:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // ---------------------------------------------------------
        // CONSULTAR FAVORITO
        // ---------------------------------------------------------

        if (
            storyFavoriteMatch &&
            request.method === "GET"
        ) {

            try {

                const storyId =
                    Number(
                        storyFavoriteMatch[1]
                    );


                if (
                    !storyId
                ) {

                    return json({
                        success: false,
                        error:
                            "ID de publicación inválido."
                    }, 400);

                }


                const session =
                    await getSession(
                        request,
                        env
                    );


                let favorited =
                    false;


                /*
                 * Si el usuario no está conectado,
                 * simplemente indicamos que no tiene
                 * la publicación en favoritos.
                 */

                if (
                    session
                ) {

                    const existingFavorite =
                        await env.DB
                            .prepare(
                                `SELECT
                                    id
                                 FROM story_favorites
                                 WHERE story_id = ?
                                   AND user_id = ?
                                 LIMIT 1`
                            )
                            .bind(
                                storyId,
                                session.id
                            )
                            .first();


                    favorited =
                        !!existingFavorite;

                }


                const count =
                    await env.DB
                        .prepare(
                            `SELECT
                                COUNT(*) AS total
                             FROM story_favorites
                             WHERE story_id = ?`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                return json({

                    success:
                        true,

                    favorited:
                        favorited,

                    favorites:
                        Number(
                            count.total || 0
                        )

                });


            } catch (error) {

                console.error(
                    "Error consultando Favorito:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: LISTAR FAVORITOS DEL USUARIO
        //
        // GET /api/favorites
        //
        // Devuelve las publicaciones que el usuario
        // autenticado tiene guardadas.
        // =========================================================

        if (
            url.pathname === "/api/favorites" &&
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
                        error:
                            "Debes iniciar sesión para ver tus favoritos."
                    }, 401);

                }


                const result =
                    await env.DB
                        .prepare(
                            `SELECT
                                stories.id,
                                stories.user_id,
                                stories.title,
                                stories.description,
                                stories.genre,
                                stories.type,
                                stories.cover_url,
                                stories.views,
                                stories.created_at,

                                users.username AS author,

                                story_favorites.created_at
                                    AS favorited_at,

                                (
                                    SELECT COUNT(*)
                                    FROM story_likes
                                    WHERE story_likes.story_id =
                                          stories.id
                                ) AS likes_count,

                                (
                                    SELECT COUNT(*)
                                    FROM story_comments
                                    WHERE story_comments.story_id =
                                          stories.id
                                ) AS comments_count

                             FROM story_favorites

                             INNER JOIN stories
                             ON stories.id =
                                story_favorites.story_id

                             INNER JOIN users
                             ON users.id =
                                stories.user_id

                             WHERE story_favorites.user_id = ?

                             ORDER BY
                                story_favorites.created_at DESC`
                        )
                        .bind(
                            session.id
                        )
                        .all();


                return json({

                    success:
                        true,

                    favorites:
                        result.results

                });


            } catch (error) {

                console.error(
                    "Error obteniendo favoritos:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // API: COMENTARIOS
        //
        // GET  /api/stories/5/comments
        // POST /api/stories/5/comments
        // =========================================================

        const storyCommentsMatch =
            url.pathname.match(
                /^\/api\/stories\/(\d+)\/comments$/
            );


        // ---------------------------------------------------------
        // LISTAR COMENTARIOS
        // ---------------------------------------------------------

        if (
            storyCommentsMatch &&
            request.method === "GET"
        ) {

            try {

                const storyId =
                    Number(
                        storyCommentsMatch[1]
                    );


                const story =
                    await env.DB
                        .prepare(
                            `SELECT id
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return json({
                        success: false,
                        error:
                            "La publicación no existe."
                    }, 404);

                }


                /*
                 * NOTA:
                 * Aquí mantenemos la consulta original
                 * de tu Worker.
                 */

                const result =
                    await env.DB
                        .prepare(
                            `SELECT
                                stories.id,
                                stories.user_id,
                                stories.title,
                                stories.description,
                                stories.genre,
                                stories.type,
                                stories.cover_url,
                                stories.views,
                                stories.created_at,
                                users.username AS author,

                                (
                                    SELECT COUNT(*)
                                    FROM story_likes
                                    WHERE story_likes.story_id =
                                          stories.id
                                ) AS likes_count,

                                (
                                    SELECT COUNT(*)
                                    FROM story_comments
                                    WHERE story_comments.story_id =
                                          stories.id
                                ) AS comments_count

                             FROM stories

                             INNER JOIN users
                             ON users.id =
                                stories.user_id

                             ORDER BY stories.id DESC

                             LIMIT 20`
                        )
                        .all();


                return json({

                    success:
                        true,

                    comments:
                        result.results

                });


            } catch (error) {

                console.error(
                    "Error obteniendo comentarios:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // ---------------------------------------------------------
        // PUBLICAR COMENTARIO
        // ---------------------------------------------------------

        if (
            storyCommentsMatch &&
            request.method === "POST"
        ) {

            try {

                const storyId =
                    Number(
                        storyCommentsMatch[1]
                    );


                const session =
                    await getSession(
                        request,
                        env
                    );


                if (!session) {

                    return json({
                        success: false,
                        error:
                            "Debes iniciar sesión para comentar."
                    }, 401);

                }


                const story =
                    await env.DB
                        .prepare(
                            `SELECT id
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(
                            storyId
                        )
                        .first();


                if (!story) {

                    return json({
                        success: false,
                        error:
                            "La publicación no existe."
                    }, 404);

                }


                const data =
                    await request.json();


                const comment =
                    String(
                        data.comment || ""
                    ).trim();


                if (!comment) {

                    return json({
                        success: false,
                        error:
                            "El comentario no puede estar vacío."
                    }, 400);

                }


                if (
                    comment.length > 1000
                ) {

                    return json({
                        success: false,
                        error:
                            "El comentario no puede superar los 1000 caracteres."
                    }, 400);

                }


                const result =
                    await env.DB
                        .prepare(
                            `INSERT INTO story_comments
                             (
                                story_id,
                                user_id,
                                comment
                             )
                             VALUES (?, ?, ?)`
                        )
                        .bind(
                            storyId,
                            session.id,
                            comment
                        )
                        .run();


                if (
                    !result.success
                ) {

                    return json({
                        success: false,
                        error:
                            "No se pudo publicar el comentario."
                    }, 500);

                }


                return json({

                    success:
                        true,

                    message:
                        "Comentario publicado correctamente.",

                    comment: {

                        id:
                            result.meta.last_row_id,

                        story_id:
                            storyId,

                        user_id:
                            session.id,

                        username:
                            session.username,

                        comment:
                            comment

                    }

                });


            } catch (error) {

                console.error(
                    "Error publicando comentario:",
                    error
                );


                return json({
                    success: false,
                    error:
                        error.message
                }, 500);

            }

        }



        // =========================================================
        // SITEMAP.XML
        // =========================================================

        if (
            url.pathname === "/sitemap.xml" &&
            request.method === "GET"
        ) {

            try {

                const result =
                    await env.DB
                        .prepare(
                            `SELECT
                                id,
                                type,
                                created_at
                             FROM stories
                             ORDER BY id DESC`
                        )
                        .all();


                const baseUrl =
                    url.origin;


                let xml =
                    `<?xml version="1.0" encoding="UTF-8"?>\n` +
                    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;


                xml +=
                    `  <url>\n` +
                    `    <loc>${escapeXml(baseUrl + "/")}</loc>\n` +
                    `    <changefreq>daily</changefreq>\n` +
                    `    <priority>1.0</priority>\n` +
                    `  </url>\n`;


                for (
                    const story of result.results
                ) {

                    let storyUrl;


                    if (
                        story.type === "historieta"
                    ) {

                        storyUrl =
                            baseUrl +
                            "/leer-historieta.html?id=" +
                            encodeURIComponent(
                                story.id
                            );

                    } else {

                        storyUrl =
                            baseUrl +
                            "/leer-historia.html?id=" +
                            encodeURIComponent(
                                story.id
                            );

                    }


                    xml +=
                        `  <url>\n` +
                        `    <loc>${escapeXml(storyUrl)}</loc>\n`;


                    if (
                        story.created_at
                    ) {

                        try {

                            const lastmod =
                                new Date(
                                    story.created_at
                                )
                                .toISOString()
                                .split("T")[0];


                            xml +=
                                `    <lastmod>${lastmod}</lastmod>\n`;

                        } catch (
                            dateError
                        ) {

                            console.error(
                                "Error procesando fecha del sitemap:",
                                dateError
                            );

                        }

                    }


                    xml +=
                        `    <changefreq>weekly</changefreq>\n` +
                        `    <priority>0.8</priority>\n` +
                        `  </url>\n`;

                }


                xml +=
                    `</urlset>`;


                return new Response(
                    xml,
                    {
                        status: 200,

                        headers: {
                            "Content-Type":
                                "application/xml; charset=utf-8",

                            "Cache-Control":
                                "public, max-age=3600"
                        }
                    }
                );


            } catch (error) {

                console.error(
                    "Error generando sitemap:",
                    error
                );


                return new Response(
                    "Error generando sitemap.",
                    {
                        status: 500,

                        headers: {
                            "Content-Type":
                                "text/plain; charset=utf-8"
                        }
                    }
                );

            }

        }



        // =========================================================
        // SITEMAP-CAPITULOS.XML
        // =========================================================

        if (
            url.pathname === "/sitemap-capitulos.xml" &&
            request.method === "GET"
        ) {

            try {

                const result =
                    await env.DB
                        .prepare(
                            `SELECT
                                chapters.id,
                                chapters.story_id,
                                chapters.chapter_number,
                                chapters.created_at,
                                stories.type
                             FROM chapters
                             INNER JOIN stories
                             ON stories.id =
                                chapters.story_id
                             ORDER BY
                                chapters.story_id DESC,
                                chapters.chapter_number ASC`
                        )
                        .all();


                const baseUrl =
                    url.origin;


                let xml =
                    `<?xml version="1.0" encoding="UTF-8"?>\n` +
                    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;


                for (
                    const chapter of result.results
                ) {

                    let chapterUrl;


                    if (
                        chapter.type === "historieta"
                    ) {

                        chapterUrl =
                            baseUrl +
                            "/leer-historieta.html?id=" +
                            encodeURIComponent(
                                chapter.story_id
                            ) +
                            "&chapter=" +
                            encodeURIComponent(
                                chapter.id
                            );

                    } else {

                        chapterUrl =
                            baseUrl +
                            "/leer-historia.html?id=" +
                            encodeURIComponent(
                                chapter.story_id
                            ) +
                            "&chapter=" +
                            encodeURIComponent(
                                chapter.id
                            );

                    }


                    xml +=
                        `  <url>\n` +
                        `    <loc>${escapeXml(chapterUrl)}</loc>\n`;


                    if (
                        chapter.created_at
                    ) {

                        try {

                            const lastmod =
                                new Date(
                                    chapter.created_at
                                )
                                .toISOString()
                                .split("T")[0];


                            xml +=
                                `    <lastmod>${lastmod}</lastmod>\n`;

                        } catch (
                            dateError
                        ) {

                            console.error(
                                "Error procesando fecha del capítulo:",
                                dateError
                            );

                        }

                    }


                    xml +=
                        `    <changefreq>weekly</changefreq>\n` +
                        `    <priority>0.7</priority>\n` +
                        `  </url>\n`;

                }


                xml +=
                    `</urlset>`;


                return new Response(
                    xml,
                    {
                        status: 200,

                        headers: {
                            "Content-Type":
                                "application/xml; charset=utf-8",

                            "Cache-Control":
                                "public, max-age=3600"
                        }
                    }
                );


            } catch (error) {

                console.error(
                    "Error generando sitemap de capítulos:",
                    error
                );


                return new Response(
                    "Error generando sitemap de capítulos.",
                    {
                        status: 500,

                        headers: {
                            "Content-Type":
                                "text/plain; charset=utf-8"
                        }
                    }
                );

            }

        }



        // =========================================================
        // ROBOTS.TXT
        // =========================================================

        if (
            url.pathname === "/robots.txt" &&
            request.method === "GET"
        ) {

            const robots =
                [
                    "User-agent: *",
                    "Allow: /",
                    "",
                    "Sitemap: " +
                    url.origin +
                    "/sitemap.xml",
                    "Sitemap: " +
                    url.origin +
                    "/sitemap-capitulos.xml"
                ]
                .join("\n");


            return new Response(
                robots,
                {
                    status: 200,

                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8",

                        "Cache-Control":
                            "public, max-age=3600"
                    }
                }
            );

        }



        // =========================================================
        // ARCHIVOS HTML / ESTÁTICOS
        // =========================================================

        return env.ASSETS.fetch(
            request
        );

    }
};



// =========================================================
// OBTENER SESIÓN
// =========================================================

async function getSession(
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
// COMPROBAR ADMINISTRADOR
// =========================================================
//
// Administrador principal de ComicWorldFiles:
//
// ID de usuario: 1
// Email: josepunkrock.1@gmail.com
//
// La comprobación se realiza en el Worker.
// Nunca se confía únicamente en admin.html.
// =========================================================

const ADMIN_USER_ID =
    1;

const ADMIN_EMAIL =
    "josepunkrock.1@gmail.com";


async function verificarAdministrador(
    request,
    env
) {

    const session =
        await getSession(
            request,
            env
        );


    /*
     * No hay sesión.
     */

    if (!session) {

        return {
            autorizado: false,

            status: 401,

            error:
                "Debes iniciar sesión."
        };
    }


    /*
     * Comprobar ID y email.
     *
     * Deben coincidir ambos.
     */

    const esAdministrador =
        Number(session.id) ===
            ADMIN_USER_ID
        &&
        String(
            session.email || ""
        )
        .toLowerCase()
        ===
        ADMIN_EMAIL.toLowerCase();


    /*
     * Usuario autenticado pero
     * no es administrador.
     */

    if (!esAdministrador) {

        return {
            autorizado: false,

            status: 403,

            error:
                "No tienes permisos de administrador."
        };
    }


    /*
     * Administrador confirmado.
     */

    return {

        autorizado: true,

        status: 200,

        user: session

    };

}

// =========================================================
// RESPUESTA JSON
// =========================================================

function json(
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
                    "application/json"
            }
        }
    );

}



// =========================================================
// HASH DE CONTRASEÑA
// =========================================================

async function hashPassword(
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

async function verifyPassword(
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

function arrayBufferToHex(
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
// TOKEN DE SESIÓN
// =========================================================

function generateToken() {

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
// COOKIES
// =========================================================

function getCookie(
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
// ESCAPAR TEXTO PARA XML
// =========================================================

function escapeXml(
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
