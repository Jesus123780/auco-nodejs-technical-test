
import Fastify, { type FastifyInstance } from 'fastify'

import { AppError } from '../../domain/errors/app-error.js'
import type { Validation } from '../../domain/entities/validation.js'
import type { CreateValidationUseCase } from '../../application/use-cases/create-validation.use-case.js'
import type { GetValidationUseCase } from '../../application/use-cases/get-validation.use-case.js'
import { parseCreateBody, parseId } from './validation.schemas.js'

export interface ApplicationServices {
  createValidation: Pick<CreateValidationUseCase, 'execute'>
  getValidation: Pick<GetValidationUseCase, 'execute'>
}

function serializeValidation(validation: Validation) {
  return {
    id: validation.id,
    name: validation.name,
    document: validation.document,
    country: validation.country,
    createdAt: validation.createdAt.toISOString()
  }
}

export function buildApp(
  services: ApplicationServices,
  logger = false
): FastifyInstance {
  const app = Fastify({
    logger,
    bodyLimit: 16384,
    disableRequestLogging: true
  })

  app.setErrorHandler((error, request, reply) => {
    // Errores controlados del dominio o aplicación
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error(
          { err: error },
          'Error de dependencia'
        )
      }

      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details
            ? { details: error.details }
            : {})
        }
      })
    }

    // Extraer statusCode de manera segura
    // sin asumir que error es un objeto.
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error
        ? error.statusCode
        : undefined

    // Errores HTTP del cliente
    if (
      typeof statusCode === 'number' &&
      Number.isInteger(statusCode) &&
      statusCode >= 400 &&
      statusCode < 500
    ) {
      return reply.code(statusCode).send({
        error: {
          code: 'BAD_REQUEST',
          message: 'Solicitud HTTP no válida.'
        }
      })
    }

    // Errores inesperados
    request.log.error(
      { err: error },
      'Error inesperado'
    )

    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servicio.'
      }
    })
  })

  // Rutas inexistentes
  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Ruta inexistente.'
      }
    })
  })

  // Health check
  app.get('/health', async () => ({
    status: 'ok'
  }))

  // Crear validación
  app.post('/validations', async (request, reply) => {
    const input = parseCreateBody(request.body)

    const result = await services.createValidation.execute(input)

    return reply.code(201).send(result)
  })

  // Obtener validación por ID
  app.get<{ Params: { id: string } }>(
    '/validations/:id',
    async (request, reply) => {
      const id = parseId(request.params.id)

      const validation = await services.getValidation.execute(id)

      return reply
        .code(200)
        .send(serializeValidation(validation))
    }
  )

  return app
}
