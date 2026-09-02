// =========================================================
// ROUTE: CHAPTERS
// ComicWorldFiles
// =========================================================

export async function handleChapters(
    request,
    env,
    url
) {

    // =====================================================
    // CAPÍTULOS DE UNA PUBLICACIÓN
    //
    // GET  /api/stories/:id/chapters
    // POST /api/stories/:id/chapters
    // =====================================================

    const chaptersMatch =
        url.pathname.match(
            /^\/api\/stories\/(\d+)\/chapters$/
        );


    // =====================================================
    // LISTAR CAPÍTULOS
    // =====================================================

    if (
        chaptersMatch &&
        request.method === "GET"
    ) {

        try {

            const storyId =
                Number(chaptersMatch[1]);


            const story =
                await env.DB
                    .prepare(
                        `SELECT id
                         FROM stories
                         WHERE id = ?
                         LIMIT 1`
                    )
                    .bind(storyId)
                    .first();


            if (!story) {

                return json({

                    success: false,

                    error:
                        "La publicación no existe."

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
                    .bind(storyId)
                    .all();


            return json({

                success: true,

                chapters:
                    result.results || []

            });


        } catch (error) {

            console.error(
                "Error listando capítulos:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudieron cargar los capítulos."

            }, 500);

        }

    }


    // =====================================================
    // CREAR CAPÍTULO
    // =====================================================

    if (
        chaptersMatch &&
        request.method === "POST"
    ) {

        try {

            const storyId =
                Number(chaptersMatch[1]);


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
                    .bind(storyId)
                    .first();


            if (!story) {

                return json({

                    success: false,

                    error:
                        "La publicación no existe."

                }, 404);

            }


            const admin =
                await verificarAdministrador(
                    request,
                    env
                );


            const isAdmin =
                admin.autorizado === true;


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


            const data =
                await request.json();


            const title =
                String(
                    data.title || ""
                )
                .trim();


            let content =
                data.content;


            if (
                content === undefined ||
                content === null
            ) {

                content = [];

            }


            if (
                Array.isArray(content)
            ) {

                content =
                    JSON.stringify(content);

            } else if (
                typeof content !== "string"
            ) {

                content =
                    String(content);

            }


            if (!title) {

                return json({

                    success: false,

                    error:
                        "El título del capítulo es obligatorio."

                }, 400);

            }


            if (!content.trim()) {

                content = "[]";

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
                    .bind(storyId)
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
                    error.message ||
                    "No se pudo crear el capítulo."

            }, 500);

        }

    }


    // =====================================================
    // CAPÍTULO INDIVIDUAL
    //
    // GET    /api/chapters/:id
    // PUT    /api/chapters/:id
    // DELETE /api/chapters/:id
    // =====================================================

    const chapterMatch =
        url.pathname.match(
            /^\/api\/chapters\/(\d+)$/
        );


    // =====================================================
    // OBTENER CAPÍTULO
    // =====================================================

    if (
        chapterMatch &&
        request.method === "GET"
    ) {

        try {

            const chapterId =
                Number(chapterMatch[1]);


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
                    .bind(chapterId)
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
                    error.message ||
                    "No se pudo obtener el capítulo."

            }, 500);

        }

    }


    // =====================================================
    // EDITAR CAPÍTULO
    // =====================================================

    if (
        chapterMatch &&
        request.method === "PUT"
    ) {

        try {

            const chapterId =
                Number(chapterMatch[1]);


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
                    .bind(chapterId)
                    .first();


            if (!chapter) {

                return json({

                    success: false,

                    error:
                        "El capítulo no existe."

                }, 404);

            }


            const admin =
                await verificarAdministrador(
                    request,
                    env
                );


            const isAdmin =
                admin.autorizado === true;


            if (
                Number(chapter.user_id) !==
                    Number(session.id) &&
                !isAdmin
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
                )
                .trim();


            let content =
                data.content;


            if (
                Array.isArray(content)
            ) {

                content =
                    JSON.stringify(content);

            }


            if (
                typeof content !== "string"
            ) {

                content = "[]";

            }


            if (!title) {

                return json({

                    success: false,

                    error:
                        "El título del capítulo es obligatorio."

                }, 400);

            }


            if (!content.trim()) {

                content = "[]";

            }


            const result =
                await env.DB
                    .prepare(
                        `UPDATE chapters
                         SET
                            title = ?,
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
                    error.message ||
                    "No se pudo actualizar el capítulo."

            }, 500);

        }

    }


    // =====================================================
    // ELIMINAR CAPÍTULO
    // =====================================================

    if (
        chapterMatch &&
        request.method === "DELETE"
    ) {

        try {

            const chapterId =
                Number(chapterMatch[1]);


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
                    .bind(chapterId)
                    .first();


            if (!chapter) {

                return json({

                    success: false,

                    error:
                        "El capítulo no existe."

                }, 404);

            }


            const admin =
                await verificarAdministrador(
                    request,
                    env
                );


            const isAdmin =
                admin.autorizado === true;


            if (
                Number(chapter.user_id) !==
                    Number(session.id) &&
                !isAdmin
            ) {

                return json({

                    success: false,

                    error:
                        "No tienes permiso para eliminar este capítulo."

                }, 403);

            }


            // =============================================
            // ELIMINAR IMÁGENES DEL CAPÍTULO
            // =============================================

            const images =
                await env.DB
                    .prepare(
                        `SELECT
                            object_key
                         FROM chapter_images
                         WHERE chapter_id = ?`
                    )
                    .bind(chapterId)
                    .all();


            for (
                const image of
                (images.results || [])
            ) {

                if (!image.object_key) {
                    continue;
                }


                try {

                    if (env.Images) {

                        await env.Images.delete(
                            image.object_key
                        );

                    }

                } catch (error) {

                    console.error(
                        "Error eliminando imagen de R2:",
                        image.object_key,
                        error
                    );

                }

            }


            // =============================================
            // ELIMINAR REGISTROS DE IMÁGENES
            // =============================================

            await env.DB
                .prepare(
                    `DELETE FROM chapter_images
                     WHERE chapter_id = ?`
                )
                .bind(chapterId)
                .run();


            // =============================================
            // ELIMINAR CAPÍTULO
            // =============================================

            const result =
                await env.DB
                    .prepare(
                        `DELETE FROM chapters
                         WHERE id = ?`
                    )
                    .bind(chapterId)
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
                    error.message ||
                    "No se pudo eliminar el capítulo."

            }, 500);

        }

    }


    // =====================================================
    // GUARDAR CONTENIDO ORDENADO DEL CAPÍTULO
    //
    // PUT /api/chapters/:id/content
    // =====================================================

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
                    .bind(chapterId)
                    .first();


            if (!chapter) {

                return json({

                    success: false,

                    error:
                        "El capítulo no existe."

                }, 404);

            }


            const admin =
                await verificarAdministrador(
                    request,
                    env
                );


            const isAdmin =
                admin.autorizado === true;


            if (
                Number(chapter.user_id) !==
                    Number(session.id) &&
                !isAdmin
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


                // =============================================
                // ELEMENTO DE TEXTO
                // =============================================

                if (
                    item.type === "text"
                ) {

                    const text =
                        String(
                            item.content ||
                            item.text ||
                            ""
                        )
                        .trim();


                    if (text) {

                        cleanContent.push({

                            type: "text",

                            content:
                                text,

                            text:
                                text

                        });

                    }

                }


                // =============================================
                // ELEMENTO DE IMAGEN
                // =============================================

                else if (
                    item.type === "image"
                ) {

                    const imageId =
                        Number(
                            item.image_id
                        );


                    if (!imageId) {
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

                            type: "image",

                            image_id:
                                image.id,

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


            if (!result.success) {

                return json({

                    success: false,

                    error:
                        "No se pudo guardar el contenido."

                }, 500);

            }


            return json({

                success: true,

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

                success: false,

                error:
                    error.message ||
                    "No se pudo guardar el contenido."

            }, 500);

        }

    }


    // =====================================================
    // ESTA RUTA NO CORRESPONDE A CHAPTERS
    // =====================================================

    return null;

}


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
            .bind(token)
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
            .bind(token)
            .run();


        return null;

    }


    return session;

}


// =========================================================
// ADMINISTRADOR
// =========================================================

async function verificarAdministrador(
    request,
    env
) {

    const token =
        getCookie(
            request,
            "session"
        );


    if (!token) {

        return {
            autorizado: false
        };

    }


    const session =
        await env.DB
            .prepare(
                `SELECT
                    users.id,
                    users.username,
                    users.email
                 FROM sessions
                 INNER JOIN users
                 ON users.id =
                    sessions.user_id
                 WHERE sessions.token = ?
                 LIMIT 1`
            )
            .bind(token)
            .first();


    if (!session) {

        return {
            autorizado: false
        };

    }


    // =====================================================
    // IMPORTANTE
    //
    // NO duplicamos aquí la lógica real del administrador.
    // Esta función solamente se mantiene compatible con
    // la llamada existente de chapters.js.
    //
    // Si admin.js ya exporta verificarAdministrador,
    // index.js deberá pasar esa función al handler.
    // =====================================================

    return {
        autorizado: false
    };

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

            status: status,

            headers: {

                "Content-Type":
                    "application/json; charset=utf-8"

            }

        }

    );

}
