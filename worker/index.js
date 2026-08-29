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

                const data = await request.json();

                const username =
                    String(data.username || "").trim();

                const email =
                    String(data.email || "")
                        .trim()
                        .toLowerCase();

                const password =
                    String(data.password || "");


                if (!username || !email || !password) {

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
                    await hashPassword(password);


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


                if (!login || !password) {

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
                    error:
                        error.message
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
        // API: CREAR HISTORIA
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
                            "Debes iniciar sesión para crear una historia."
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


                if (title.length < 2) {

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
                                genre
                             )
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
                        error:
                            "No se pudo guardar la historia."
                    }, 500);
                }


                const storyId =
                    result.meta.last_row_id;


                return json({
                    success: true,

                    message:
                        "Historia creada correctamente.",

                    story: {
                        id:
                            storyId,

                        title:
                            title,

                        description:
                            description,

                        genre:
                            genre,

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
                    "Error creando historia:",
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
        // API: LISTAR HISTORIAS
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
                                stories.cover_url,
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
                    "Error listando historias:",
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
        // API: HISTORIA INDIVIDUAL
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
                                stories.cover_url,
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
                            "La historia no existe."
                    }, 404);
                }


                return json({
                    success: true,

                    story:
                        story
                });


            } catch (error) {

                console.error(
                    "Error obteniendo historia:",
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
        //
        // POST /api/stories/5/cover
        //
        // FormData:
        // cover = archivo
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


                // -------------------------------------------------
                // COMPROBAR SESIÓN
                // -------------------------------------------------

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


                // -------------------------------------------------
                // COMPROBAR HISTORIA
                // -------------------------------------------------

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


                // -------------------------------------------------
                // COMPROBAR PROPIETARIO
                // -------------------------------------------------

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


                // -------------------------------------------------
                // OBTENER FORM DATA
                // -------------------------------------------------

                const formData =
                    await request.formData();


                const file =
                    formData.get("cover");


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


                // -------------------------------------------------
                // COMPROBAR TAMAÑO
                // Máximo: 5 MB
                // -------------------------------------------------

                const maxSize =
                    5 * 1024 * 1024;


                if (
                    file.size > maxSize
                ) {

                    return json({
                        success: false,
                        error:
                            "La imagen no puede superar los 5 MB."
                    }, 400);
                }


                // -------------------------------------------------
                // COMPROBAR TIPO
                // -------------------------------------------------

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


                // -------------------------------------------------
                // CLAVE R2
                //
                // La misma clave se utiliza siempre.
                //
                // Por eso una nueva portada
                // reemplaza automáticamente
                // la anterior.
                // -------------------------------------------------

                const objectKey =
                    "covers/" +
                    session.id +
                    "/" +
                    storyId;


                // -------------------------------------------------
                // GUARDAR EN R2
                // -------------------------------------------------

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


                // -------------------------------------------------
                // URL PÚBLICA DE SERVICIO
                // -------------------------------------------------

                const coverUrl =
                    "/api/stories/" +
                    storyId +
                    "/cover";


                // -------------------------------------------------
                // GUARDAR URL EN D1
                // -------------------------------------------------

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


                // -------------------------------------------------
                // RESPUESTA
                // -------------------------------------------------

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
        //
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


                // -------------------------------------------------
                // COMPROBAR QUE LA HISTORIA EXISTE
                // -------------------------------------------------

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


                // -------------------------------------------------
                // CLAVE R2
                // -------------------------------------------------

                const objectKey =
                    "covers/" +
                    story.user_id +
                    "/" +
                    storyId;


                // -------------------------------------------------
                // OBTENER IMAGEN
                // -------------------------------------------------

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


                // -------------------------------------------------
                // CABECERAS
                // -------------------------------------------------

                const headers =
                    new Headers();


                object.writeHttpMetadata(
                    headers
                );


                headers.set(
                    "etag",
                    object.httpEtag
                );


                headers.set(
                    "Cache-Control",
                    "public, max-age=3600"
                );


                // -------------------------------------------------
                // RESPUESTA
                // -------------------------------------------------

                return new Response(
                    object.body,
                    {
                        status: 200,
                        headers: headers
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
        // API: CAPÍTULOS DE UNA HISTORIA
        // GET /api/stories/5/chapters
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
        // API: CREAR CAPÍTULO
        // POST /api/stories/5/chapters
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


                const content =
                    String(
                        data.content || ""
                    );


                if (!title) {

                    return json({
                        success: false,
                        error:
                            "El título del capítulo es obligatorio."
                    }, 400);
                }


                if (!content.trim()) {

                    return json({
                        success: false,
                        error:
                            "El contenido del capítulo es obligatorio."
                    }, 400);
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


                if (!result.success) {

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
        //
        // GET    /api/chapters/10
        // PUT    /api/chapters/10
        // DELETE /api/chapters/10
        // =========================================================

        const chapterMatch =
            url.pathname.match(
                /^\/api\/chapters\/(\d+)$/
            );



        // =========================================================
        // OBTENER CAPÍTULO
        // =========================================================

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
        // PUT /api/chapters/10
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


                const content =
                    String(
                        data.content || ""
                    );


                if (!title) {

                    return json({
                        success: false,
                        error:
                            "El título del capítulo es obligatorio."
                    }, 400);
                }


                if (!content.trim()) {

                    return json({
                        success: false,
                        error:
                            "El contenido del capítulo es obligatorio."
                    }, 400);
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


                if (!result.success) {

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
        // DELETE /api/chapters/10
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


                if (!result.success) {

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
        // ARCHIVOS HTML / ESTÁTICOS
        // =========================================================

        return env.ASSETS.fetch(request);
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
        new Date(session.expires_at)
        <= new Date()
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
// RESPUESTA JSON
// =========================================================

function json(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(data),
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
            byte =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join("");
}



// =========================================================
// TOKEN DE SESIÓN
// =========================================================

function generateToken() {

    const bytes =
        new Uint8Array(32);


    crypto.getRandomValues(
        bytes
    );


    return Array
        .from(bytes)
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    )
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
        cookieHeader.split(";");


    for (
        const cookie of cookies
    ) {

        const parts =
            cookie
                .trim()
                .split("=");


        if (
            parts[0] === name
        ) {

            return parts
                .slice(1)
                .join("=");
        }
    }


    return null;
}
