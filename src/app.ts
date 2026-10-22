import "dotenv/config";
import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "@/presentation/routes/app.route";
import { getDIContainer } from "@/di-container";
import { requestContextMiddleware } from "./presentation/middleware/request-context.middleware";

class App {
  public app: Application;
  public port: number;
  public readonly diContainer = getDIContainer();

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || "3000");

    this.app.set("trust proxy", true);
    this.app.set("query parser", "extended");
    this.app.use(cors({ origin: process.env.CLIENT_URL!, credentials: true }));
    this.app.use(cookieParser());
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(requestContextMiddleware(this.diContainer.nodeAsyncLocalStorage, this.diContainer.idGenerator, this.diContainer.authTokenDecoder));
  }

  private initializeRoutes(): void {
    routes(this.app);

    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
      return this.diContainer.httpErrorFilter.catch(err, res);
    });
  }

  public async initialize(): Promise<void> {
    await this.diContainer.eventQueueProcessor.start();
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 Server running on port ${this.port}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: ${this.diContainer.appIdentity.baseUrl}/health`);
    });
  }
}

async function bootstrap() {
  try {
    const app = new App();
    await app.initialize();
    app.listen();
  } catch (error) {
    console.error("Failed to bootstrap application", error);
    process.exit(1);
  }
}

bootstrap();
