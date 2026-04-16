import { createFileStream, findGeneratedFile } from '../lib/files.js';

export async function registerFilesRoute(fastify) {
  fastify.get('/files/:fileId', async (request, reply) => {
    const fileRecord = await findGeneratedFile(request.params.fileId);

    if (!fileRecord) {
      return reply.code(404).send({ error: 'File not found.' });
    }

    const stream = await createFileStream(fileRecord.ruta_archivo);
    reply.header('Content-Type', fileRecord.mime_type);
    reply.header('Content-Disposition', `attachment; filename="${fileRecord.nombre_archivo}"`);
    return reply.send(stream);
  });
}