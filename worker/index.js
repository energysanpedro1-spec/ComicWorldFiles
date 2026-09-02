import { handleLikes } from "./routes/likes.js";
import { handleFavorites } from "./routes/favorites.js";
import { handleImages } from "./routes/images.js";
import { handleComments } from "./routes/comments.js";
import { handleChapters } from "./routes/chapters.js";
import { handleLogin } from "./routes/login.js";
import {
    handleAdmin,
    verificarAdministrador
} from "./routes/admin.js";

export default {

    async fetch(request, env) {

        const url = new URL(request.url);


// =====================================================
// RUTAS SEPARADAS
// =====================================================

// -----------------------------------------------------
// ME GUSTA
// /api/stories/:id/like
// -----------------------------------------------------

if (
    url.pathname.startsWith("/api/stories/")
) {

    const response =
        await handleLikes(
            request,
            env,
            url
        );

    if (response) {
        return response;
    }

}


// -----------------------------------------------------
// FAVORITOS
// /api/stories/:id/favorite
// -----------------------------------------------------

if (
    url.pathname.startsWith("/api/stories/")
) {

    const response =
        await handleFavorites(
            request,
            env,
            url
        );

    if (response) {
        return response;
    }

}


// -----------------------------------------------------
// IMÁGENES DE CAPÍTULOS
//
// /api/chapters/:id/images
// /api/chapter-images/:id
// -----------------------------------------------------

if (
    url.pathname.startsWith("/api/chapters/") ||
    url.pathname.startsWith("/api/chapter-images/")
) {

    const response =
        await handleImages(
            request,
            env,
            url
        );

    if (response) {
        return response;
    }

}


// -----------------------------------------------------
// CAPÍTULOS
//
// /api/stories/:id/chapters
// /api/chapters/:id
// /api/chapters/:id/content
// -----------------------------------------------------

if (
    /^\/api\/stories\/\d+\/chapters$/.test(
        url.pathname
    ) ||
    /^\/api\/chapters\/\d+(\/content)?$/.test(
        url.pathname
    )
) {

    const response =
        await handleChapters(
            request,
            env,
            url,
            getSession,
            verificarAdministrador,
            json
        );

    if (response) {
        return response;
    }

}


// -----------------------------------------------------
// COMENTARIOS
// /api/stories/:id/comments
// -----------------------------------------------------

if (
    url.pathname.startsWith("/api/stories/")
) {

    const response =
        await handleComments(
            request,
            env,
            url
        );

    if (response) {
        return response;
    }

}


// -----------------------------------------------------
// ADMIN
// -----------------------------------------------------

if (
    url.pathname.startsWith("/api/admin")
) {

    const response =
        await handleAdmin(
            request,
            env,
            url
        );

    if (response) {
        return response;
    }

}

// -----------------------------------------------------
// AUTENTICACIÓN
//
// /api/register
// /api/login
// /api/me
// /api/logout
// -----------------------------------------------------

if (
    url.pathname === "/api/register" ||
    url.pathname === "/api/login" ||
    url.pathname === "/api/me" ||
    url.pathname === "/api/logout"
) {

    const response =
        await handleLogin(
            request,
            env,
            url,
            getSession,
            json,
            hashPassword,
            verifyPassword,
            generateToken,
            getCookie
        );

    if (response) {
        return response;
    }

}

        // =====================================================
        // API: LISTAR AUTORES
        // GET /api/authors
        // =====================================================

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

                                COUNT(
                                    stories.id
                                ) AS publications

                             FROM users

                             INNER JOIN stories
                             ON stories.user_id =
                                users.id

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


        // =====================================================
        // API TEST
        // GET /api/test
        // =====================================================

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
                    error: error.message
                }, 500);

            }

        }


        // =====================================================
        // API: CREAR HISTORIA / HISTORIETA
        // POST /api/stories
        // =====================================================

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


                if (!result.success) {

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
                    error: error.message
                }, 500);

            }

        }

        // =====================================================
// API: EDITAR HISTORIA / HISTORIETA
// PUT /api/stories/:id
// =====================================================

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
        // OBTENER ID DE LA HISTORIA
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
        // BUSCAR HISTORIA
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
        // PERMISOS
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
        // LEER DATOS
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
        // VALIDACIONES
        // =============================================

        if (!title) {

            return json({

                success: false,

                error:
                    "El título es obligatorio."

            }, 400);

        }


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
        // ACTUALIZAR HISTORIA
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
        // OBTENER HISTORIA ACTUALIZADA
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


        // =====================================================
        // API: REGISTRAR VISITA
        // POST /api/stories/:id/view
        // =====================================================

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
                    Number(storyViewMatch[1]);


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
                        .bind(storyId)
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
                         SET views =
                            COALESCE(views, 0) + 1
                         WHERE id = ?`
                    )
                    .bind(storyId)
                    .run();


                const updated =
                    await env.DB
                        .prepare(
                            `SELECT views
                             FROM stories
                             WHERE id = ?
                             LIMIT 1`
                        )
                        .bind(storyId)
                        .first();


                return json({
                    success: true,
                    views:
                        Number(updated.views || 0)
                });


            } catch (error) {

                console.error(
                    "Error registrando visita:",
                    error
                );

                return json({
                    success: false,
                    error: error.message
                }, 500);

            }

        }


        // =====================================================
        // API: EDITAR INFORMACIÓN DE PUBLICACIÓN
        // PUT /api/stories/:id
        // =====================================================

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
                    Number(editStoryMatch[1]);


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
                        .bind(storyId)
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
                    String(data.title || "")
                        .trim();


                const description =
                    String(data.description || "")
                        .trim();


                const genre =
                    String(data.genre || "")
                        .trim();


                const type =
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


                if (title.length < 2) {

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


                if (!result.success) {

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
                    error: error.message
                }, 500);

            }

        }


        // =====================================================
        // API: LISTAR HISTORIAS / HISTORIETAS
        // GET /api/stories
        // =====================================================

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
                    error: error.message
                }, 500);

            }

        }


        // =====================================================
        // API: PUBLICACIÓN INDIVIDUAL
        // GET /api/stories/:id
        // =====================================================

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
                    Number(storyMatch[1]);


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
                        .bind(storyId)
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
                    story: story
                });


            } catch (error) {

                console.error(
                    "Error obteniendo publicación:",
                    error
                );

                return json({
                    success: false,
                    error: error.message
                }, 500);

            }

        }


        // =====================================================
        // API: SUBIR / REEMPLAZAR PORTADA
        // POST /api/stories/:id/cover
        // =====================================================

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
                    Number(coverMatch[1]);


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


                const maxSize =
                    5 * 1024 * 1024;


                if (file.size > maxSize) {

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
                    story.user_id +
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
                                String(story.user_id)
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
                        error.message ||
                        "No se pudo subir la portada."
                }, 500);

            }

        }


        // =====================================================
        // API: SERVIR PORTADA DESDE R2
        // GET /api/stories/:id/cover
        // =====================================================

        if (
            coverMatch &&
            request.method === "GET"
        ) {

            try {

                const storyId =
                    Number(coverMatch[1]);


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

                    return new Response(
                        "Publicación no encontrada.",
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

        // =====================================================
        // API: LISTAR FAVORITOS DEL USUARIO
        //
        // GET /api/favorites
        // =====================================================

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
                        .bind(session.id)
                        .all();


                return json({
                    success: true,

                    favorites:
                        result.results || []
                });


            } catch (error) {

                console.error(
                    "Error obteniendo favoritos:",
                    error
                );

                return json({
                    success: false,
                    error:
                        error.message ||
                        "No se pudieron obtener los favoritos."
                }, 500);

            }

        }


        // =====================================================
        // SITEMAP.XML
        // =====================================================

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
                    const story of
                    (result.results || [])
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


                    if (story.created_at) {

                        try {

                            const lastmod =
                                new Date(
                                    story.created_at
                                )
                                .toISOString()
                                .split("T")[0];


                            xml +=
                                `    <lastmod>${lastmod}</lastmod>\n`;

                        } catch (dateError) {

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


        // =====================================================
        // SITEMAP-CAPITULOS.XML
        // =====================================================

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
                    const chapter of
                    (result.results || [])
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


                    if (chapter.created_at) {

                        try {

                            const lastmod =
                                new Date(
                                    chapter.created_at
                                )
                                .toISOString()
                                .split("T")[0];


                            xml +=
                                `    <lastmod>${lastmod}</lastmod>\n`;

                        } catch (dateError) {

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


        // =====================================================
        // ROBOTS.TXT
        // =====================================================

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


        // =====================================================
        // ARCHIVOS HTML / ESTÁTICOS
        // =====================================================

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
            new Uint8Array(buffer)
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
        new Uint8Array(32);


    crypto.getRandomValues(
        bytes
    );


    return Array
        .from(bytes)
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
// ESCAPAR TEXTO PARA XML
// =========================================================

function escapeXml(
    value
) {

    return String(value)
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
