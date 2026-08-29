export default {

    async fetch(request, env) {

        const url = new URL(request.url);

        /*
         * ==========================================
         * RESPUESTA PRINCIPAL
         * ==========================================
         */

        if (url.pathname === "/api/test") {

            try {

                const result = await env.DB
                    .prepare("SELECT 1 AS test")
                    .first();

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: "ComicWorldFiles API funcionando",
                        database: result
                    }),
                    {
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );

            } catch (error) {

                return new Response(
                    JSON.stringify({
                        success: false,
                        error: error.message
                    }),
                    {
                        status: 500,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );

            }
        }


        /*
         * ==========================================
         * RUTA NO ENCONTRADA
         * ==========================================
         */

        return new Response(
            "ComicWorldFiles API",
            {
                status: 404
            }
        );
    }
};
