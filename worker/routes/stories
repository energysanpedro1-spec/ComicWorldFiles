export async function handleStories(
    request,
    env,
    url,
    getSession,
    verificarAdministrador,
    json
) {


    // =================================================
    // CREAR HISTORIA / HISTORIETA
    // POST /api/stories
    // =================================================

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
                String(data.title || "")
                    .trim();


            const description =
                String(data.description || "")
                    .trim();


            const genre =
                String(data.genre || "")
                    .trim();


            let type =
                String(
                    data.type || "historia"
                )
                .trim()
                .toLowerCase();


            // =============================================
            // VALIDAR TIPO
            // =============================================

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


            // =============================================
            // VALIDAR CAMPOS
            // =============================================

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


            // =============================================
            // INSERTAR PUBLICACIÓN
            // =============================================

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
                    id: storyId,
                    title: title,
                    description: description,
                    genre: genre,
                    type: type,
                    views: 0,
                    cover_url: null,
                    author: session.username,
                    user_id: session.id
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


    // =================================================
    // EDITAR HISTORIA / HISTORIETA
    // PUT /api/stories/:id
    // =================================================

    const storyUpdateMatch =
        url.pathname.match(
            /^\/api\/stories\/(\d+)$/
        );


    if (
        storyUpdateMatch &&
        request.method === "PUT"
    ) {

        try {

            // =============================================
            // COMPROBAR SESIÓN
            // =============================================

            const session =
                await getSession(
                    request,
                    env
                );


            if (!session) {

                return json({
                    success: false,
                    error:
                        "Debes iniciar sesión para editar esta publicación."
                }, 401);

            }


            // =============================================
            // OBTENER ID
            // =============================================

            const storyId =
                Number(
                    storyUpdateMatch[1]
                );


            if (
                !Number.isInteger(storyId) ||
                storyId <= 0
            ) {

                return json({
                    success: false,
                    error:
                        "ID de publicación inválido."
                }, 400);

            }


            // =============================================
            // BUSCAR PUBLICACIÓN
            // =============================================

            const story =
                await env.DB
                    .prepare(
                        `SELECT
                            id,
                            user_id,
                            title,
                            description,
                            genre,
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


            // =============================================
            // COMPROBAR ADMINISTRADOR
            // =============================================

            let isAdminUser =
                false;


            try {

                const adminAuth =
                    await verificarAdministrador(
                        request,
                        env
                    );


                if (
                    adminAuth &&
                    adminAuth.autorizado
                ) {

                    isAdminUser =
                        true;

                }

            } catch (adminError) {

                console.error(
                    "Error comprobando administrador:",
                    adminError
                );

                isAdminUser =
                    false;

            }


            // =============================================
            // COMPROBAR PROPIETARIO
            // =============================================

            const isOwner =
                Number(session.id) ===
                Number(story.user_id);


            // =============================================
            // COMPROBAR PERMISOS
            // =============================================

            if (
                !isOwner &&
                !isAdminUser
            ) {

                return json({
                    success: false,
                    error:
                        "No tienes permiso para editar esta publicación."
                }, 403);

            }


            // =============================================
            // LEER JSON
            // =============================================

            let body;


            try {

                body =
                    await request.json();

            } catch (error) {

                return json({
                    success: false,
                    error:
                        "El cuerpo de la solicitud no es un JSON válido."
                }, 400);

            }


            // =============================================
            // DATOS ACTUALIZADOS
            //
            // Si un campo no viene en la petición,
            // se conserva el valor actual.
            // =============================================

            const title =
                body.title !== undefined
                    ? String(
                        body.title
                    ).trim()
                    : story.title;


            const description =
                body.description !== undefined
                    ? String(
                        body.description
                    ).trim()
                    : (
                        story.description ||
                        ""
                    );


            const genre =
                body.genre !== undefined
                    ? String(
                        body.genre
                    ).trim()
                    : (
                        story.genre ||
                        ""
                    );


            const type =
                body.type !== undefined
                    ? String(
                        body.type
                    )
                    .trim()
                    .toLowerCase()
                    : story.type;


            // =============================================
            // VALIDAR TÍTULO
            // =============================================

            if (!title) {

                return json({
                    success: false,
                    error:
                        "El título es obligatorio."
                }, 400);

            }


            // =============================================
            // VALIDAR TIPO
            // =============================================

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


            // =============================================
            // ACTUALIZAR
            // =============================================

            const result =
                await env.DB
                    .prepare(
                        `UPDATE stories
                         SET
                            title = ?,
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


            // =============================================
            // OBTENER PUBLICACIÓN ACTUALIZADA
            // =============================================

            const updatedStory =
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

                         LEFT JOIN users
                         ON users.id =
                            stories.user_id

                         WHERE stories.id = ?

                         LIMIT 1`
                    )
                    .bind(
                        storyId
                    )
                    .first();


            // =============================================
            // RESPUESTA
            // =============================================

            return json({

                success: true,

                loggedIn: true,

                isAdmin:
                    isAdminUser,

                message:
                    "Publicación actualizada correctamente.",

                story:
                    updatedStory

            }, 200);


        } catch (error) {

            console.error(
                "Error editando publicación:",
                error
            );


            return json({
                success: false,
                error:
                    error.message ||
                    "No se pudo actualizar la publicación."
            }, 500);

        }

    }


    // =================================================
    // REGISTRAR VISITA
    // POST /api/stories/:id/view
    // =================================================

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


            // =============================================
            // COMPROBAR EXISTENCIA
            // =============================================

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


            // =============================================
            // INCREMENTAR VISITAS
            // =============================================

            await env.DB
                .prepare(
                    `UPDATE stories
                     SET views =
                        COALESCE(views, 0) + 1
                     WHERE id = ?`
                )
                .bind(
                    storyId
                )
                .run();


            // =============================================
            // OBTENER NUEVO CONTADOR
            // =============================================

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


    // =================================================
    // LISTAR HISTORIAS / HISTORIETAS
    // GET /api/stories
    // =================================================

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
                         ON users.id =
                            stories.user_id

                         ORDER BY stories.id DESC

                         LIMIT 20`
                    )
                    .all();


            return json({
                success: true,
                stories:
                    result.results || []
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


    // =================================================
    // PUBLICACIÓN INDIVIDUAL
    // GET /api/stories/:id
    // =================================================

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
                         ON users.id =
                            stories.user_id

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


    // =================================================
    // SUBIR / REEMPLAZAR PORTADA
    // POST /api/stories/:id/cover
    // =================================================

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


            // =============================================
            // COMPROBAR SESIÓN
            // =============================================

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


            // =============================================
            // BUSCAR PUBLICACIÓN
            // =============================================

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
                        "La publicación no existe."
                }, 404);

            }


            // =============================================
            // COMPROBAR ADMIN
            // =============================================

            const admin =
                await verificarAdministrador(
                    request,
                    env
                );


            const isAdmin =
                admin.autorizado === true;


            // =============================================
            // COMPROBAR PROPIETARIO
            // =============================================

            if (
                Number(story.user_id) !==
                    Number(session.id) &&
                !isAdmin
            ) {

                return json({
                    success: false,
                    error:
                        "No tienes permiso para modificar esta publicación."
                }, 403);

            }


            // =============================================
            // LEER FORMULARIO
            // =============================================

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


            // =============================================
            // TAMAÑO MÁXIMO
            // =============================================

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


            // =============================================
            // TIPOS PERMITIDOS
            // =============================================

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


            // =============================================
            // CLAVE R2
            // =============================================

            const objectKey =
                "covers/" +
                story.user_id +
                "/" +
                storyId;


            // =============================================
            // SUBIR A R2
            // =============================================

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
                            String(story.user_id)
                    }
                }
            );


            // =============================================
            // URL DE PORTADA
            // =============================================

            const coverUrl =
                "/api/stories/" +
                storyId +
                "/cover";


            // =============================================
            // GUARDAR URL EN D1
            // =============================================

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
                    error.message ||
                    "No se pudo subir la portada."
            }, 500);

        }

    }


    // =================================================
    // SERVIR PORTADA DESDE R2
    // GET /api/stories/:id/cover
    // =================================================

    if (
        coverMatch &&
        request.method === "GET"
    ) {

        try {

            const storyId =
                Number(
                    coverMatch[1]
                );


            // =============================================
            // BUSCAR PUBLICACIÓN
            // =============================================

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
                    "Publicación no encontrada.",
                    {
                        status: 404
                    }
                );

            }


            // =============================================
            // CLAVE R2
            // =============================================

            const objectKey =
                "covers/" +
                story.user_id +
                "/" +
                storyId;


            // =============================================
            // OBTENER OBJETO
            // =============================================

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


            // =============================================
            // HEADERS
            // =============================================

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


            // =============================================
            // RESPUESTA
            // =============================================

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


    // =================================================
    // ESTA RUTA NO ES DE STORIES
    // =================================================

    return null;

}
