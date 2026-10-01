// Errors from a vex-platform API: RFC 9457 problem details. Older routes answer `{msg}` (or `{message}`), which is
// read the same way so a site can use one error class for both.

export interface FieldError {
  loc: (string | number)[]
  msg: string
  type: string
}

export class ProblemError extends Error {
  /** A stable snake_case code to branch on (`job_conflict`, `invalid`, `bad_cursor`…), or null. */
  readonly code: string | null
  readonly title: string | null
  readonly detail: string | null
  readonly requestId: string | null
  /** A validation failure's fields (422 `invalid`). */
  readonly errors: FieldError[]
  /** Seconds, from Retry-After. */
  readonly retryAfter: number | null

  constructor(
    readonly status: number,
    /** The whole error body, for fields a route adds. */
    readonly body: Record<string, unknown> = {},
    retryAfter: number | null = null,
  ) {
    const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
    const detail = str(body.detail) ?? str(body.msg) ?? str(body.message)
    super(detail ?? str(body.title) ?? `HTTP ${status}`)
    this.name = 'ProblemError'
    this.code = str(body.code)
    this.title = str(body.title)
    this.detail = detail
    this.requestId = str(body.request_id)
    this.errors = Array.isArray(body.errors) ? (body.errors as FieldError[]) : []
    this.retryAfter = retryAfter
  }

  /** Not signed in, or not allowed. */
  get unauthorized(): boolean {
    return this.status === 401 || this.status === 403
  }

  /** Parses a failed response. */
  static async from(res: Response): Promise<ProblemError> {
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      // not JSON (a proxy's error page, say)
    }
    const retry = Number(res.headers.get('retry-after'))
    return new ProblemError(
      res.status,
      body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {},
      Number.isFinite(retry) && retry > 0 ? retry : null,
    )
  }
}

/** The text to show for a caught error: a problem's detail, with the field errors of a 422. */
export function errorText(e: unknown): string {
  if (e instanceof ProblemError && e.errors.length) {
    return `${e.message}: ${e.errors.map((f) => `${f.loc.filter((l) => l !== 'body').join('.')} ${f.msg}`).join('; ')}`
  }
  return e instanceof Error ? e.message : String(e)
}
