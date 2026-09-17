import { CreativeOrchestrator } from './creativeOrchestrator.service';
import {
  PromptFaithfulImageProvider,
  PromptFaithfulVideoProvider,
} from './promptFaithfulCreativeProviders';

/**
 * Server-only provider policy.
 *
 * CreativeOrchestrator owns credits, durable storage, semantic QA and receipts.
 * The provider pool is replaced here so generation cannot silently succeed with
 * synthetic placeholder media or house-authored scenes that were not requested.
 */
const orchestrator = CreativeOrchestrator as any;

orchestrator.imageProviders = [
  new PromptFaithfulImageProvider(),
];

orchestrator.videoProviders = [
  new PromptFaithfulVideoProvider(),
];
