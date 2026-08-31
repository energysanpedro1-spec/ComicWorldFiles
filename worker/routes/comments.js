// =========================================================
// COMICWORLDFILES
// ROUTE: COMMENTS
//
// Gestiona:
//
// GET    /api/stories/:id/comments
// POST   /api/stories/:id/comments
// DELETE /api/comments/:id
//
// Tablas utilizadas:
//
// stories
// users
// story_comments
// =========================================================


// =========================================================
// ADMINISTRADOR
// =========================================================

const ADMIN_USER_ID = 1;

const ADMIN_EMAIL =
    "josepunkrock.1@gmail.com";


// =========================================================
// HANDLER PRINCIPAL
// =========================================================

export async function handleComments(
    request,
    env,
    url
) {

    // =====================================================
    // GET /api/stories/:id/comments
    //
    // Obtener comentarios de una publicación
    // =====================================================

    const storyCommentsMatch =
        url.pathname.match(
            /^\/api\/stories\/(\d+)\/comments$/
        );


    if (
        storyCommentsMatch &&
        request.method === "GET"
    ) {

        try {

            const storyId =
                Number(
                    storyCommentsMatch[1]
                );


            if (!storyId) {

                return json({
                    success: false,
                    error:
                        "ID de publicación inválido."
                }, 400);

            }


            // =================================================
            // COMPROBAR PUBLICACIÓN
            // =================================================

            const story =
                await env.DB
                    .prepare(
                        `SELECT
                            id
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


            // =================================================
            // OBTENER COMENTARIOS
            // =================================================

            const result =
                await env.DB
                    .prepare(
                        `SELECT
                            story_comments.id,
                            story_comments.story_id,
                            story_comments.user_id,
                            story_comments.comment,
                            story_comments.created_at,

                            users.username

                         FROM story_comments

                         INNER JOIN users
                         ON users.id =
                            story_comments.user_id

                         WHERE story_comments.story_id = ?

                         ORDER BY
                            story_comments.created_at DESC,
                            story_comments.id DESC`
                    )
                    .bind(
                        storyId
                    )
                    .all();


            return json({

                success: true,

                comments:
                    result.results || []

            });


        } catch (error) {

            console.error(
                "Error obteniendo comentarios:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudieron obtener los comentarios."

            }, 500);

        }

    }


    // =====================================================
    // POST /api/stories/:id/comments
    //
    // Crear comentario
    // =====================================================

    if (
        storyCommentsMatch &&
        request.method === "POST"
    ) {

        try {

            const storyId =
                Number(
                    storyCommentsMatch[1]
                );


            if (!storyId) {

                return json({
                    success: false,
                    error:
                        "ID de publicación inválido."
                }, 400);

            }


            // =================================================
            // COMPROBAR SESIÓN
            // =================================================

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


            // =================================================
            // COMPROBAR PUBLICACIÓN
            // =================================================

            const story =
                await env.DB
                    .prepare(
                        `SELECT
                            id
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


            // =================================================
            // LEER BODY
            // =================================================

            let data;

            try {

                data =
                    await request.json();

            } catch (error) {

                return json({

                    success: false,

                    error:
                        "Los datos enviados no son válidos."

                }, 400);

            }


            // =================================================
            // OBTENER TEXTO
            // =================================================

            const comment =
                String(
                    data.comment || ""
                ).trim();


            // =================================================
            // VALIDAR COMENTARIO
            // =================================================

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


            // =================================================
            // INSERTAR COMENTARIO
            // =================================================

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


            const commentId =
                result.meta.last_row_id;


            // =================================================
            // OBTENER COMENTARIO CREADO
            // =================================================

            const newComment =
                await env.DB
                    .prepare(
                        `SELECT
                            story_comments.id,
                            story_comments.story_id,
                            story_comments.user_id,
                            story_comments.comment,
                            story_comments.created_at,

                            users.username

                         FROM story_comments

                         INNER JOIN users
                         ON users.id =
                            story_comments.user_id

                         WHERE story_comments.id = ?

                         LIMIT 1`
                    )
                    .bind(
                        commentId
                    )
                    .first();


            // =================================================
            // RESPUESTA
            // =================================================

            return json({

                success: true,

                message:
                    "Comentario publicado correctamente.",

                comment:
                    newComment || {

                        id:
                            commentId,

                        story_id:
                            storyId,

                        user_id:
                            session.id,

                        username:
                            session.username,

                        comment:
                            comment

                    }

            }, 201);


        } catch (error) {

            console.error(
                "Error publicando comentario:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudo publicar el comentario."

            }, 500);

        }

    }


    // =========================================================
    // DELETE /api/comments/:id
    //
    // El usuario puede eliminar sus propios comentarios.
    //
    // El administrador puede eliminar cualquier comentario.
    // =========================================================

    const commentMatch =
        url.pathname.match(
            /^\/api\/comments\/(\d+)$/
        );


    if (
        commentMatch &&
        request.method === "DELETE"
    ) {

        try {

            const commentId =
                Number(
                    commentMatch[1]
                );


            if (!commentId) {

                return json({

                    success: false,

                    error:
                        "ID de comentario inválido."

                }, 400);

            }


            // =================================================
            // COMPROBAR SESIÓN
            // =================================================

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


            // =================================================
            // OBTENER COMENTARIO
            // =================================================

            const comment =
                await env.DB
                    .prepare(
                        `SELECT
                            id,
                            story_id,
                            user_id,
                            comment,
                            created_at

                         FROM story_comments

                         WHERE id = ?

                         LIMIT 1`
                    )
                    .bind(
                        commentId
                    )
                    .first();


            if (!comment) {

                return json({

                    success: false,

                    error:
                        "El comentario no existe."

                }, 404);

            }


            // =================================================
            // COMPROBAR ADMIN
            // =================================================

            const isAdmin =
                Number(session.id) ===
                    ADMIN_USER_ID
                &&
                String(
                    session.email || ""
                )
                .toLowerCase()
                ===
                ADMIN_EMAIL.toLowerCase();


            // =================================================
            // COMPROBAR PERMISOS
            // =================================================

            const isOwner =
                Number(
                    comment.user_id
                ) ===
                Number(
                    session.id
                );


            if (
                !isOwner &&
                !isAdmin
            ) {

                return json({

                    success: false,

                    error:
                        "No tienes permiso para eliminar este comentario."

                }, 403);

            }


            // =================================================
            // ELIMINAR
            // =================================================

            const result =
                await env.DB
                    .prepare(
                        `DELETE FROM story_comments
                         WHERE id = ?`
                    )
                    .bind(
                        commentId
                    )
                    .run();


            if (
                !result.success
            ) {

                return json({

                    success: false,

                    error:
                        "No se pudo eliminar el comentario."

                }, 500);

            }


            // =================================================
            // RESPUESTA
            // =================================================

            return json({

                success: true,

                message:
                    "Comentario eliminado correctamente.",

                comment_id:
                    commentId

            });


        } catch (error) {

            console.error(
                "Error eliminando comentario:",
                error
            );


            return json({

                success: false,

                error:
                    error.message ||
                    "No se pudo eliminar el comentario."

            }, 500);

        }

    }


    // =========================================================
    // ESTA RUTA NO CORRESPONDE A COMMENTS
    // =========================================================

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
            .bind(
                token
            )
            .first();


    if (!session) {

        return null;

    }


    // =====================================================
    // COMPROBAR EXPIRACIÓN
    // =====================================================

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
// OBTENER COOKIE
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
                    "application/json; charset=utf-8"

            }

        }

    );

}
