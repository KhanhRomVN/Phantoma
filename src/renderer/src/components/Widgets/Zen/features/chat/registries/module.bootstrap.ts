import {
  registerZenModule,
  getModuleTagRegistries,
  getModuleTagRegistriesByModule,
} from './module.registry';
import { injectModuleRegistries } from './tag.registry';
import { codeModule } from '@renderer/modules/Code/code.module';
import { emulateModule } from '@renderer/modules/Emulate/EmulateModule';
import { reconModule } from '@renderer/modules/Recon/ReconModule';

[codeModule, emulateModule, reconModule].forEach(registerZenModule);
injectModuleRegistries(getModuleTagRegistries(), getModuleTagRegistriesByModule());