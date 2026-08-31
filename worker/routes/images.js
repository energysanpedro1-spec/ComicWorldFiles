import {
    getSession,
    json
} from "../utils.js";


// =========================================================
// API: IMÁGENES DE CAPÍTULO
//
// GET  /api/chapters/:id/images
// POST /api/chapters/:id/images
//
// GET    /api/chapter-images/:id
// DELETE /api/chapter-images/:id
// =========================================================

export async function handleImages(
    request,
    env,
    url
) {

    // =========================================================
    // RUTAS
    // =========================================================

    const chapterImagesMatch =
        url.pathname.match(
            /^\/api\/chapters\/(\d+)\/images$/
        );


    const chapterImageMatch =
        url.pathname.match(
            /^\/api\/chapter-images\/(\d+)$/
        );


    // ---------------------------------------------------------
    // NO ES UNA RUTA DE IMÁGENES
    // ---------------------------------------------------------

    if (
        !chapterImagesMatch &&
        !chapterImageMatch
    ) {

        return null;

    }


    // =========================================================
    // GET /api/chapters/:id/images
    //
    // OBTENER TODAS LAS IMÁGENES DE UN CAPÍTULO
    // =========================================================

    if (
        chapterImagesMatch &&
        request.method === "GET"
    ) {

        try {

            const chapterId =
                Number(
                    chapterImagesMatch[1]
                );


            if (!chapterId) {

                return json({
                    success: false,
                    error:
                        "ID de capítulo inválido."
                }, 400);

            }


            // -------------------------------------------------
            // COMPROBAR CAPÍTULO
            // -------------------------------------------------

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


            // -------------------------------------------------
            // OBTENER IMÁGENES
            // -------------------------------------------------

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

                success:
                    true,

                images:
                    result.results || []

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
    // POST /api/chapters/:id/images
    //
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


            if (!chapterId) {

                return json({
                    success: false,
                    error:
                        "ID de capítulo inválido."
                }, 400);

            }


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
            // COMPROBAR CAPÍTULO Y PROPIETARIO
            // -------------------------------------------------

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


            // -------------------------------------------------
            // LEER FORMULARIO
            // -------------------------------------------------

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


            // -------------------------------------------------
            // COMPROBAR TAMAÑO
            // -------------------------------------------------

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


            // -------------------------------------------------
            // COMPROBAR FORMATO
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
            // DETERMINAR EXTENSIÓN
            // -------------------------------------------------

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


            // -------------------------------------------------
            // CREAR KEY ÚNICA PARA R2
            // -------------------------------------------------

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


            // -------------------------------------------------
            // SUBIR A R2
            // -------------------------------------------------

            if (!env.Images) {

                return json({
                    success: false,
                    error:
                        "El almacenamiento de imágenes no está configurado."
                }, 500);

            }


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


            // -------------------------------------------------
            // REGISTRAR EN D1
            // -------------------------------------------------

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

                // Si D1 falla, eliminamos el archivo de R2.

                try {

                    await env.Images.delete(
                        objectKey
                    );

                } catch (
                    cleanupError
                ) {

                    console.error(
                        "Error eliminando imagen de R2 después de fallo D1:",
                        cleanupError
                    );

                }


                return json({
                    success: false,
                    error:
                        "No se pudo registrar la imagen."
                }, 500);

            }


            // -------------------------------------------------
            // ID DE LA IMAGEN
            // -------------------------------------------------

            const imageId =
                result.meta &&
                result.meta.last_row_id;


            if (!imageId) {

                try {

                    await env.Images.delete(
                        objectKey
                    );

                } catch (
                    cleanupError
                ) {

                    console.error(
                        "Error eliminando imagen sin ID:",
                        cleanupError
                    );

                }


                return json({
                    success: false,
                    error:
                        "No se pudo obtener el ID de la imagen."
                }, 500);

            }


            // -------------------------------------------------
            // URL PÚBLICA INTERNA
            // -------------------------------------------------

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


            // -------------------------------------------------
            // RESPUESTA
            // -------------------------------------------------

            return json({

                success:
                    true,

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
    // GET /api/chapter-images/:id
    //
    // SERVIR IMAGEN DESDE R2
    // =========================================================

    if (
        chapterImageMatch &&
        request.method === "GET"
    ) {

        try {

            const imageId =
                Number(
                    chapterImageMatch[1]
                );


            if (!imageId) {

                return new Response(
                    "ID de imagen inválido.",
                    {
                        status: 400
                    }
                );

            }


            // -------------------------------------------------
            // BUSCAR IMAGEN EN D1
            // -------------------------------------------------

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


            // -------------------------------------------------
            // BUSCAR OBJETO EN R2
            // -------------------------------------------------

            if (!env.Images) {

                return new Response(
                    "El almacenamiento de imágenes no está configurado.",
                    {
                        status: 500
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


            // -------------------------------------------------
            // HEADERS
            // -------------------------------------------------

            const headers =
                new Headers();


            object.writeHttpMetadata(
                headers
            );


            if (
                object.httpEtag
            ) {

                headers.set(
                    "ETag",
                    object.httpEtag
                );

            }


            headers.set(
                "Cache-Control",
                "public, max-age=3600"
            );


            // -------------------------------------------------
            // DEVOLVER IMAGEN
            // -------------------------------------------------

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
    // DELETE /api/chapter-images/:id
    //
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


            if (!imageId) {

                return json({
                    success: false,
                    error:
                        "ID de imagen inválido."
                }, 400);

            }


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
            // OBTENER IMAGEN + PROPIETARIO
            // -------------------------------------------------

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


            // -------------------------------------------------
            // COMPROBAR PROPIETARIO
            // -------------------------------------------------

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


            // -------------------------------------------------
            // ELIMINAR DE R2
            // -------------------------------------------------

            if (env.Images) {

                await env.Images.delete(
                    image.object_key
                );

            }


            // -------------------------------------------------
            // ELIMINAR DE D1
            // -------------------------------------------------

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


            // =================================================
            // LIMPIAR IMAGEN DEL CONTENIDO DEL CAPÍTULO
            // =================================================

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

                        console.error(
                            "Error parseando contenido del capítulo:",
                            parseError
                        );

                        blocks =
                            [];

                    }


                    if (
                        Array.isArray(
                            blocks
                        )
                    ) {

                        const filteredBlocks =
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
                                    filteredBlocks
                                ),
                                image.chapter_id
                            )
                            .run();

                    }

                }

            } catch (
                cleanupError
            ) {

                /*
                 * La imagen ya fue eliminada.
                 * Si falla solamente la limpieza del contenido,
                 * no hacemos fallar toda la operación.
                 */

                console.error(
                    "Error limpiando imagen del contenido:",
                    cleanupError
                );

            }


            // -------------------------------------------------
            // RESPUESTA
            // -------------------------------------------------

            return json({

                success:
                    true,

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
    // MÉTODO NO PERMITIDO
    // =========================================================

    return json({
        success: false,
        error:
            "Método no permitido."
    }, 405);

}
