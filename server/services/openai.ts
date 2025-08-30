import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Helper function to invoke Bedrock models
async function invokeBedrock(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const messages = [
      ...(systemPrompt ? [{ role: "user", content: systemPrompt }] : []),
      { role: "user", content: prompt }
    ];

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0", // Using Claude 3.5 Sonnet via Bedrock
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        messages: messages
      })
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.content[0].text;
  } catch (error) {
    console.error('AWS Bedrock error:', error);
    throw new Error('Failed to invoke AWS Bedrock: ' + (error as Error).message);
  }
}

export interface CodeAnalysisResult {
  detectedLanguages: Record<string, number>;
  architecture: string;
  issues: Array<{
    type: string;
    severity: "high" | "medium" | "low";
    file: string;
    description: string;
    line?: number;
  }>;
  suggestions: Array<{
    type: string;
    title: string;
    description: string;
    file?: string;
    changes?: string;
  }>;
}

export async function analyzeCodebase(files: Array<{ path: string; content: string; language?: string }>): Promise<CodeAnalysisResult> {
  try {
    const fileList = files.map(f => `${f.path} (${f.language || 'unknown'})`).join('\n');
    const sampleContent = files.slice(0, 5).map(f => `// ${f.path}\n${f.content.slice(0, 1000)}`).join('\n\n');

    const prompt = `Analyze this codebase and provide a comprehensive analysis. 

Files in project:
${fileList}

Sample content from key files:
${sampleContent}

Please analyze and return JSON with this exact structure:
{
  "detectedLanguages": { "language": percentage },
  "architecture": "string describing the overall architecture pattern",
  "issues": [
    {
      "type": "string",
      "severity": "high|medium|low", 
      "file": "filename",
      "description": "description",
      "line": number_optional
    }
  ],
  "suggestions": [
    {
      "type": "string",
      "title": "suggestion title",
      "description": "detailed description",
      "file": "filename_optional",
      "changes": "proposed changes_optional"
    }
  ]
}

Focus on:
1. Language detection with percentages
2. Architecture pattern identification
3. Code quality issues (missing docs, duplications, unused imports, etc.)
4. Actionable improvement suggestions
5. Best practices violations`;

    const systemPrompt = "You are an expert code analyst. Analyze codebases and provide structured feedback on architecture, issues, and improvements. Always respond with valid JSON.";
    const result = await invokeBedrock(prompt, systemPrompt);
    return JSON.parse(result) as CodeAnalysisResult;
  } catch (error) {
    console.error('AWS Bedrock analysis error:', error);
    throw new Error('Failed to analyze codebase: ' + (error as Error).message);
  }
}

export async function generateDocumentation(code: string, filename: string): Promise<string> {
  try {
    const prompt = `Generate comprehensive documentation for this code file.

Filename: ${filename}
Code:
${code}

Add:
1. JSDoc/docstring comments for functions and classes
2. Inline comments for complex logic
3. File header description
4. Parameter and return type documentation

Return only the enhanced code with documentation added.`;

    const systemPrompt = "You are a documentation expert. Add comprehensive documentation to code files while preserving all original functionality.";
    const result = await invokeBedrock(prompt, systemPrompt);
    return result || code;
  } catch (error) {
    console.error('Documentation generation error:', error);
    throw new Error('Failed to generate documentation: ' + (error as Error).message);
  }
}

export async function suggestCodeImprovements(code: string, filename: string): Promise<{
  improved: string;
  changes: Array<{
    type: "addition" | "modification" | "removal";
    description: string;
    lineStart?: number;
    lineEnd?: number;
  }>;
}> {
  try {
    const prompt = `Improve this code by fixing issues, adding error handling, and following best practices.

Filename: ${filename}
Code:
${code}

Return JSON with this structure:
{
  "improved": "the improved code",
  "changes": [
    {
      "type": "addition|modification|removal",
      "description": "what was changed",
      "lineStart": number_optional,
      "lineEnd": number_optional
    }
  ]
}

Focus on:
1. Error handling
2. Type safety
3. Performance improvements
4. Code clarity
5. Best practices`;

    const systemPrompt = "You are a code improvement expert. Enhance code quality while maintaining functionality. Always respond with valid JSON.";
    const result = await invokeBedrock(prompt, systemPrompt);
    return JSON.parse(result);
  } catch (error) {
    console.error('Code improvement error:', error);
    throw new Error('Failed to suggest improvements: ' + (error as Error).message);
  }
}
