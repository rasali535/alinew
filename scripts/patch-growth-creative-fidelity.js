const fs = require('fs');
const path = require('path');

const growthPath = path.join(process.cwd(), 'apps/ralion/src/app/(dashboard)/growth/page.tsx');
const aimlPath = path.join(process.cwd(), 'packages/ai/src/aimlClient.ts');

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Could not find ${label} start marker`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Could not find ${label} end marker`);
  return source.slice(0, start) + replacement + source.slice(end);
}

let growth = fs.readFileSync(growthPath, 'utf8');

const generatorStart = '  // Media Generators — Real Server-Side Generation Pipeline & Durable Storage';
const generatorEnd = '  const handleAiGenerate = async () => {';

const generatorReplacement = `  // Media Generators — Prompt-faithful server generation only.\n  // Never manufacture a placeholder asset and report it as generated media.\n  const generateMedia = async (type: 'poster' | 'video') => {\n    const prompt = type === 'poster' ? posterPrompt : videoPrompt;\n    if (!prompt.trim()) return;\n\n    if (type === 'poster') {\n      setIsGeneratingPoster(true);\n      setGeneratedPoster('');\n    } else {\n      setIsGeneratingVideo(true);\n      setGeneratedVideo('');\n    }\n\n    try {\n      const normalizedPosterFormat: Record<string, string> = {\n        '1:1 Square': '1:1',\n        '4:5 Portrait': '4:5',\n        '16:9 Landscape': '16:9',\n        '9:16 Story / Reel': '9:16',\n      };\n\n      const requestedFormat = type === 'poster'\n        ? (normalizedPosterFormat[posterFormat] || '1:1')\n        : '16:9';\n\n      let asset: any = null;\n      let generationError = 'Creative generation failed. No placeholder was created.';\n\n      try {\n        const res = await authFetch('/api/creatives/generate', {\n          method: 'POST',\n          body: JSON.stringify({\n            type: type === 'poster' ? 'POSTER_IMAGE' : 'VIDEO_REEL',\n            prompt: prompt.trim(),\n            style: type === 'poster' ? posterStyle : undefined,\n            format: requestedFormat,\n            organizationId: organization?.id || undefined,\n            workspaceId: workspace?.id || undefined,\n          }),\n        });\n\n        const data = await res.json().catch(() => ({}));\n        if (res.ok && data.success && data.asset) {\n          asset = data.asset;\n        } else {\n          generationError = data.userFacingMessage || data.error || generationError;\n        }\n      } catch (networkError: any) {\n        console.warn('[Growth Studio] Creative generation request failed:', networkError);\n        generationError = networkError?.message\n          ? \\`Creative generation service is unavailable: \\${networkError.message}\\`\n          : 'Creative generation service is unavailable. No placeholder was created.';\n      }\n\n      if (!asset) {\n        throw new Error(generationError);\n      }\n\n      let finalDisplayUrl = asset.mediaUrl || asset.publicUrl || asset.previewUrl || asset.directUrl || '';\n      if (!finalDisplayUrl) {\n        throw new Error('The generation provider completed without a usable media URL. Nothing was added to the creative library.');\n      }\n\n      try {\n        const resolvedSigned = await resolveSecureAssetUrl(asset.id || asset.assetId || finalDisplayUrl);\n        if (resolvedSigned?.signedUrl) finalDisplayUrl = resolvedSigned.signedUrl;\n      } catch {}\n\n      const assetId = asset.id || asset.assetId || \\`asset-\\${Date.now()}\\`;\n      const assetTitle = asset.title || (prompt.length > 40 ? prompt.substring(0, 36).trim() + '...' : prompt.trim());\n      const assetPrompt = asset.prompt || prompt.trim();\n      const providerLabel = asset.provider || asset.model || asset.generator || 'Prompt-Faithful Creative Engine';\n\n      if (type === 'poster') {\n        setGeneratedPoster(finalDisplayUrl);\n\n        const newItem: GeneratedContentItem = {\n          id: assetId,\n          type: 'POSTER_IMAGE',\n          title: assetTitle,\n          prompt: assetPrompt,\n          output: finalDisplayUrl,\n          previewUrl: finalDisplayUrl,\n          modelUsed: providerLabel,\n          createdAt: 'Just now',\n        };\n        setGeneratedGallery(prev => [newItem, ...prev]);\n        setOauthAlert({\n          type: 'success',\n          message: '🎨 Creative visual generated, validated, and saved to your library.',\n        });\n      } else {\n        setGeneratedVideo(finalDisplayUrl);\n\n        const newItem: GeneratedContentItem = {\n          id: assetId,\n          type: 'VIDEO_REEL',\n          title: assetTitle,\n          prompt: assetPrompt,\n          output: finalDisplayUrl,\n          previewUrl: finalDisplayUrl,\n          modelUsed: providerLabel,\n          createdAt: 'Just now',\n        };\n        setGeneratedGallery(prev => [newItem, ...prev]);\n        setOauthAlert({\n          type: 'success',\n          message: '🎥 Video generation completed, validated, and saved to your library.',\n        });\n      }\n\n      setTimeout(() => setOauthAlert(null), 4000);\n    } catch (error: any) {\n      console.error('[Growth Studio Media Gen Error]:', error);\n      setOauthAlert({\n        type: 'error',\n        message: \\`❌ \\${error?.message || 'Creative generation failed. No placeholder was created.'}\\`,\n      });\n    } finally {\n      setIsGeneratingPoster(false);\n      setIsGeneratingVideo(false);\n    }\n  };\n\n`;

growth = replaceBetween(growth, generatorStart, generatorEnd, generatorReplacement, 'Growth media generator');

const qaStart = '                  {/* Commercial Visual QA Scorecard Widget */}';
const qaEnd = '                  {/* Export & Convert Actions */}';
const qaReplacement = `                  {/* Commercial Visual Validation — only shown after a real server-generated asset succeeds. */}\n                  {generatedPoster && (\n                    <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col gap-2">\n                      <div className="flex items-center justify-between gap-2">\n                        <div className="flex items-center gap-1.5">\n                          <Shield className="w-3.5 h-3.5 text-emerald-400" />\n                          <span className="text-[11px] font-bold text-white uppercase tracking-wider">Commercial Visual Validation</span>\n                        </div>\n                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">\n                          SERVER VALIDATED\n                        </span>\n                      </div>\n                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-zinc-400 font-medium">\n                        <span className="text-emerald-400">✓ Real provider output</span>\n                        <span className="text-emerald-400">✓ Semantic relevance gate applied</span>\n                        <span className="text-emerald-400">✓ Durable asset saved</span>\n                      </div>\n                    </div>\n                  )}\n\n`;

growth = replaceBetween(growth, qaStart, qaEnd, qaReplacement, 'hard-coded creative QA widget');

fs.writeFileSync(growthPath, growth);

let aiml = fs.readFileSync(aimlPath, 'utf8');
aiml = aiml.replace(
  /\n\s*const seed = Math\.floor\(Math\.random\(\) \* 1000000\);\n\s*const directVideoUrl = `https:\/\/image\.pollinations\.ai\/prompt\/\$\{encodeURIComponent\(cleanPrompt\)\}\?model=flux-realism&width=1024&height=576&nologo=true&seed=\$\{seed\}`;/,
  ''
);
aiml = aiml.replace(
  /\n\s*return \{\n\s*success: true,\n\s*url: directVideoUrl,\n\s*format: 'url',\n\s*model: 'zai-org\/CogVideoX-2b',\n\s*\};/,
  `\n\n  return {\n    success: false,\n    error: 'Real video generation is currently unavailable. No image or placeholder was substituted for a video.',\n  };`
);
fs.writeFileSync(aimlPath, aiml);

console.log('Applied Growth creative-fidelity patch and removed image-as-video fallback.');
