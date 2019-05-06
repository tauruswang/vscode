/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from 'vs/base/common/network';
import { DataUri, basenameOrAuthority } from 'vs/base/common/resources';
import { URI as uri } from 'vs/base/common/uri';
import { PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { FileKind } from 'vs/platform/files/common/files';

export function getIconClasses(modelService: IModelService, modeService: IModeService, resource: uri | undefined, fileKind?: FileKind): string[] {

	// we always set these base classes even if we do not have a path
	const classes = fileKind === FileKind.ROOT_FOLDER ? ['rootfolder-icon'] : fileKind === FileKind.FOLDER ? ['folder-icon'] : ['file-icon'];
	if (resource) {

		// Get the path and name of the resource. For data-URIs, we need to parse specially
		let name: string | undefined;
		if (resource.scheme === Schemas.data) {
			const metadata = DataUri.parseMetaData(resource);
			name = metadata.get(DataUri.META_DATA_LABEL);
		} else {
			name = cssEscape(basenameOrAuthority(resource).toLowerCase());
		}

		// Folders
		if (fileKind === FileKind.FOLDER) {
			classes.push(`${name}-name-folder-icon`);
		}

		// Files
		else {

			// Name & Extension(s)
			if (name) {
				classes.push(`${name}-name-file-icon`);
				const dotSegments = name.split('.');
				for (let i = 1; i < dotSegments.length; i++) {
					classes.push(`${dotSegments.slice(i).join('.')}-ext-file-icon`); // add each combination of all found extensions if more than one
				}
				classes.push(`ext-file-icon`); // extra segment to increase file-ext score
			}

			// Detected Language
			const detectedLangId: string | null = detectLangId(modelService, modeService, resource);
			if (detectedLangId) {
				classes.push(`${cssEscape(detectedLangId)}-lang-file-icon`);
			}
		}
	}
	return classes;
}

export function detectLangId(modelService: IModelService, modeService: IModeService, resource: uri): string | null {
	let detectedLangId: string | null = null;
	if (resource) {
		let modeId: string | null = null;

		// Data URI: check for encoded metadata
		if (resource.scheme === Schemas.data) {
			const metadata = DataUri.parseMetaData(resource);
			const mime = metadata.get(DataUri.META_DATA_MIME);

			if (mime) {
				modeId = modeService.getModeId(mime);
			}
		}

		// Any other URI: check for model if existing and fallback to path based detection
		else {
			const model = modelService.getModel(resource);
			if (model) {
				modeId = model.getLanguageIdentifier().language;
			} else {
				modeId = modeService.getModeIdByFilepathOrFirstLine(resource.path.toLowerCase());
			}
		}

		if (modeId && modeId !== PLAINTEXT_MODE_ID) {
			detectedLangId = modeId; // only take if the mode is specific (aka no just plain text)
		}
	}

	return detectedLangId;
}

export function cssEscape(val: string): string {
	return val.replace(/\s/g, '\\$&'); // make sure to not introduce CSS classes from files that contain whitespace
}
