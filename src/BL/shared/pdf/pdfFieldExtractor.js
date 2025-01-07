class FieldExtractor {
    processPdfText(text, fieldMappings) {
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');
        
        const result = {};
        
        for (const mapping of fieldMappings) {
            this._processMapping(mapping, lines, result, fieldMappings);
        }
        
        return result;
    }

    _processMapping(mapping, lines, result, fieldMappings) {
        const { key, value, untilKey } = mapping;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === key) {
                // Check if the next line matches any key in fieldMappings
                const nextLine = lines[i + 1];
                const isNextLineAKey = fieldMappings.some(mapping => mapping.key === nextLine);
                
                if (isNextLineAKey) {
                    result[key] = null;
                } else {
                    result[key] = this._extractValue(lines, i, value, untilKey);
                }
                break;
            }
        }
    }

    _extractValue(lines, currentIndex, valueType, untilKey) {
        if (valueType === 'nextLine') {
            return lines[currentIndex + 1] || null;
        }
        
        if (valueType.startsWith('next')) {
            const count = parseInt(valueType.replace('next', ''), 10);
            return lines.slice(currentIndex + 1, currentIndex + 1 + count).join(' ');
        }
        
        if (valueType === 'untilKey') {
            const endIndex = lines.slice(currentIndex + 1)
                .findIndex(line => line === untilKey);
            return lines.slice(currentIndex + 1, currentIndex + 1 + endIndex)
                .join(' ');
        }
        
        if (valueType === 'digitAndNamePattern') {
            return this._extractDigitAndNamePattern(lines, currentIndex);
        }
        
        return null;
    }

    _extractDigitAndNamePattern(lines, startIndex) {
        const extractedItems = [];
        const validLinePattern = /^(\d+)([א-ת\s-]+)$/;

        for (let j = startIndex + 1; j < lines.length; j++) {
            const line = lines[j];
            const match = line.match(validLinePattern);

            if (!match) {
                break;
            }

            extractedItems.push({
                name: match[2].trim(),
                amount: parseInt(match[1], 10),
            });
        }

        return extractedItems;
    }
}

module.exports = { FieldExtractor };