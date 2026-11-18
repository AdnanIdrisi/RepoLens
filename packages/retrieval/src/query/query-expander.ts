export interface QueryIntent {
  category: string;
  confidence: number;
  expandedTerms: string[];
  suggestedEntityTypes?: string[];
}

export interface ExpandedQuery {
  originalQuery: string;
  intents: QueryIntent[];
  expandedTerms: string[];
  combinedQueryString: string;
  preferredEntityTypes: string[];
}

interface IntentRule {
  category: string;
  triggers: RegExp[];
  expandedTerms: string[];
  suggestedEntityTypes?: string[];
}

export class QueryExpander {
  private static readonly RULES: IntentRule[] = [
    {
      category: "AUTHENTICATION_AUTHORIZATION",
      triggers: [
        /\b(auth|unauthorized|authenticate|authorization|protected|forbidden|permission|permissions|role|roles|access control)\b/i,
        /\b(tokens?|jwt|bearer|refresh tokens?|access tokens?|verify tokens?)\b/i,
        /\b(login|log in|logout|log out|sessions?|credentials?|passwords?|oauth|passport)\b/i
      ],
      expandedTerms: [
        "auth", "authenticate", "authorization", "jwt", "token", "verify", "bearer",
        "unauthorized", "status(401)", "status(403)", "passport", "session",
        "req.user", "accessToken", "refreshToken", "verifyToken", "authMiddleware", "protect"
      ],
      suggestedEntityTypes: ["middleware", "function", "route"]
    },
    {
      category: "ROUTES_AND_API_FLOW",
      triggers: [
        /\b(routes?|endpoints?|controllers?|apis?|handlers?|express|routers?|middlewares?)\b/i,
        /\b(frontend communicate|travel from frontend|backend controller|request travel)\b/i,
        /\b(get|post|put|patch|delete|app\.use|router\.use)\b/i
      ],
      expandedTerms: [
        "route", "router", "endpoint", "controller", "req", "res", "next",
        "middleware", "handler", "get", "post", "put", "delete", "use",
        "request", "response", "json", "send", "status"
      ],
      suggestedEntityTypes: ["route", "middleware", "function"]
    },
    {
      category: "DATABASE_OPERATIONS",
      triggers: [
        /\b(database|db|query|queries|collections?|tables?|schemas?|models?|repository|repositories)\b/i,
        /\b(save|saved|insert|update|find|findone|findbyid|delete|create|persist|store)\b/i,
        /\b(mongoose|prisma|typeorm|sequelize|mongodb|postgres|mysql|sqlite)\b/i
      ],
      expandedTerms: [
        "db", "query", "find", "findOne", "findById", "create", "save", "update",
        "deleteOne", "deleteMany", "schema", "model", "repository", "aggregate",
        "select", "where", "exec"
      ],
      suggestedEntityTypes: ["function", "class", "method"]
    },
    {
      category: "ERROR_HANDLING",
      triggers: [
        /\b(errors?|exceptions?|fail|fails|failure|failures|crash|crashes|handle errors|query fail|catch|throw)\b/i,
        /\b(500|404|400|bad request|internal server error|try catch)\b/i
      ],
      expandedTerms: [
        "error", "catch", "throw", "next(err)", "next(error)", "errorHandler",
        "HttpError", "status(500)", "status(400)", "status(404)", "console.error",
        "instanceof Error", "try"
      ],
      suggestedEntityTypes: ["error_handler", "middleware", "function"]
    },
    {
      category: "PAYMENTS_BILLING",
      triggers: [
        /\b(payments?|pay|billing|checkout|charges?|stripe|invoices?|subscriptions?|refunds?|transactions?)\b/i
      ],
      expandedTerms: [
        "stripe", "payment", "charge", "checkout", "invoice", "customer",
        "createCharge", "createPaymentIntent", "webhook", "processPayment",
        "amount", "currency", "receipt"
      ],
      suggestedEntityTypes: ["function", "route", "class"]
    },
    {
      category: "INPUT_VALIDATION",
      triggers: [
        /\b(validate|validates?|validation|validator|form submit|forms?|user input|sanitize|schema parse)\b/i,
        /\b(zod|joi|yup|class-validator|body-parser)\b/i
      ],
      expandedTerms: [
        "validate", "validator", "schema", "zod", "joi", "parse", "safeParse",
        "isValid", "sanitize", "req.body", "badRequest", "validationResult"
      ],
      suggestedEntityTypes: ["middleware", "function"]
    },
    {
      category: "ENVIRONMENT_AND_CONFIG",
      triggers: [
        /\b(environment|environments?|env|process\.env|dotenv|config|configuration|configurations?|secrets?|apikeys?|settings?)\b/i
      ],
      expandedTerms: [
        "process.env", "env", "config", "dotenv", "NODE_ENV", "PORT", "SECRET",
        "DATABASE_URL", "API_KEY"
      ],
      suggestedEntityTypes: ["config", "function"]
    },
    {
      category: "BACKGROUND_JOBS_AND_QUEUES",
      triggers: [
        /\b(background|workers?|jobs?|queues?|cron|schedules?|tasks?|agenda|bull)\b/i
      ],
      expandedTerms: [
        "queue", "worker", "job", "process", "cron", "schedule", "task",
        "bull", "agenda", "interval"
      ],
      suggestedEntityTypes: ["function", "class"]
    }
  ];

  /**
   * Expands a user query into code-specific terminology, synonyms, and suggested entity kinds.
   */
  public static expand(query: string): ExpandedQuery {
    const matchedIntents: QueryIntent[] = [];
    const expandedTermsSet = new Set<string>();
    const preferredTypesSet = new Set<string>();

    for (const rule of this.RULES) {
      let matchCount = 0;
      for (const trigger of rule.triggers) {
        if (trigger.test(query)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        matchedIntents.push({
          category: rule.category,
          confidence: Math.min(1.0, 0.4 + matchCount * 0.3),
          expandedTerms: rule.expandedTerms,
          suggestedEntityTypes: rule.suggestedEntityTypes
        });

        for (const term of rule.expandedTerms) {
          expandedTermsSet.add(term);
        }

        if (rule.suggestedEntityTypes) {
          for (const type of rule.suggestedEntityTypes) {
            preferredTypesSet.add(type);
          }
        }
      }
    }

    const expandedTerms = Array.from(expandedTermsSet);
    const combinedQueryString = `${query} ${expandedTerms.slice(0, 15).join(" ")}`;

    return {
      originalQuery: query,
      intents: matchedIntents,
      expandedTerms,
      combinedQueryString,
      preferredEntityTypes: Array.from(preferredTypesSet)
    };
  }
}
