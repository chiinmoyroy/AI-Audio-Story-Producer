import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { DramatizedScript, SceneElement } from './types';
import { analyzeScript, generateFullAudio } from './services/geminiService';
import CharacterVoiceMapper from './components/CharacterVoiceMapper';
import { BrainCircuitIcon, PlayIcon, WandSparklesIcon, FileTextIcon, SaveIcon, UploadIcon } from './components/Icons';
import { BACKGROUND_MUSIC_TRACKS } from './constants';


declare const pdfjsLib: any; // For pdf.js loaded from CDN
const LOCAL_STORAGE_KEY = 'aiAudioStoryProducerSave';

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [dramatizedScript, setDramatizedScript] = useState<DramatizedScript | null>(null);
  const [characterVoices, setCharacterVoices] = useState<Record<string, string>>({});
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [backgroundMusic, setBackgroundMusic] = useState<string>('none');
  const [musicVolume, setMusicVolume] = useState<number>(0.2);
  const [areSoundEffectsEnabled, setAreSoundEffectsEnabled] = useState<boolean>(true);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');


  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set worker source for pdf.js
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
    }
    // Check for saved data on mount
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    setHasSavedData(!!savedData);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter a story or script to analyze.');
      return;
    }
    setError(null);
    setDramatizedScript(null);
    setAudioUrl(null);
    setIsLoading(true);
    setLoadingMessage('Analyzing script, identifying characters, and adding dramatic cues...');
    try {
      const result = await analyzeScript(text);
      setDramatizedScript(result);
      const initialVoices: Record<string, string> = {};
      result.characters.forEach(char => {
        initialVoices[char] = 'Kore'; // Default voice
      });
      initialVoices['Narrator'] = 'Zephyr';
      setCharacterVoices(initialVoices);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze the script. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  }, [text]);

  const handleProduceAudio = useCallback(async () => {
    if (!dramatizedScript) {
      setError('Please analyze a script first.');
      return;
    }
    setError(null);
    setAudioUrl(null);
    setIsLoading(true);
    setLoadingMessage('Generating audio... This may take a few moments.');
    try {
      const url = await generateFullAudio(
        dramatizedScript,
        characterVoices,
        {
          musicTrackKey: backgroundMusic,
          musicVolume,
          generateSfx: areSoundEffectsEnabled,
        }
      );
      setAudioUrl(url);
    } catch (err) {
      console.error(err);
      setError('Failed to produce the audio. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  }, [dramatizedScript, characterVoices, backgroundMusic, musicVolume, areSoundEffectsEnabled]);
  
  const handlePdfUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingMessage('Parsing PDF...');
    setError(null);
    setText('');

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            if (e.target?.result) {
                const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
                const loadingTask = pdfjsLib.getDocument(typedArray);
                const pdf = await loadingTask.promise;
                
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: { str: string }) => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }
                setText(fullText.trim());
            }
        } catch (err) {
            console.error(err);
            setError('Failed to parse the PDF file. It might be corrupted or in an unsupported format.');
        } finally {
            setIsLoading(false);
        }
    };
    
    reader.onerror = () => {
        setError('Failed to read the PDF file.');
        setIsLoading(false);
    }
    
    reader.readAsArrayBuffer(file);

    // Reset file input to allow re-uploading the same file
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleSaveProgress = useCallback(() => {
    if (!text && !dramatizedScript) {
        setError("Nothing to save.");
        return;
    }
    const dataToSave = { text, dramatizedScript };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    setHasSavedData(true);
    setSaveMessage('Progress Saved!');
    setTimeout(() => setSaveMessage(''), 3000);
  }, [text, dramatizedScript]);

  const handleLoadProgress = useCallback(() => {
      const savedDataJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedDataJSON) {
          const savedData = JSON.parse(savedDataJSON);
          
          setError(null);
          setAudioUrl(null);
          
          setText(savedData.text || '');
          setDramatizedScript(savedData.dramatizedScript || null);

          if (savedData.dramatizedScript) {
              const loadedScript: DramatizedScript = savedData.dramatizedScript;
              const initialVoices: Record<string, string> = {};
              loadedScript.characters.forEach(char => {
                  initialVoices[char] = 'Kore';
              });
              initialVoices['Narrator'] = 'Zephyr';
              setCharacterVoices(initialVoices);
          } else {
              setCharacterVoices({});
          }
      } else {
          setError("No saved data found.");
      }
  }, []);

  const renderScriptElement = (element: SceneElement, index: number) => {
    const key = `scene-${index}`;
    switch (element.type) {
      case 'narration':
        return (
          <p key={key} className="italic text-gray-400 my-2">
            <strong className="font-bold text-purple-400">Narrator:</strong> {element.content}
          </p>
        );
      case 'dialogue':
        return (
          <p key={key} className="my-2">
            <strong className="font-bold text-cyan-400">{element.character}:</strong> {element.content}
          </p>
        );
      case 'sound_cue':
        return (
          <p key={key} className="text-yellow-400 my-2 bg-gray-800 p-2 rounded-md text-sm">
            <strong className="font-bold">Sound:</strong> {element.description}
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            AI Audio Story Producer
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Transform your text into an immersive audio drama.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input & Controls */}
          <div className="flex flex-col gap-6 p-6 bg-gray-800/50 rounded-2xl border border-gray-700 shadow-lg">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="story-input" className="text-xl font-semibold text-gray-300">
                  1. Your Story Script
                </label>
                <div className="flex items-center gap-2">
                    {saveMessage && <span className="text-green-400 text-sm animate-pulse">{saveMessage}</span>}
                    <button onClick={handleSaveProgress} disabled={isLoading || !text} title="Save Progress" className="flex items-center gap-2 p-2 text-sm bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors">
                        <SaveIcon />
                    </button>
                     <button onClick={handleLoadProgress} disabled={isLoading || !hasSavedData} title="Load Progress" className="flex items-center gap-2 p-2 text-sm bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors">
                        <UploadIcon />
                    </button>
                    <button onClick={handlePdfUploadClick} disabled={isLoading} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors">
                        <FileTextIcon />
                        PDF
                    </button>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    style={{ display: 'none' }}
                />
              </div>
              <textarea
                id="story-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your story, script, or dialogue here... or upload a PDF."
                className="w-full h-64 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 resize-none"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !text}
              className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-purple-500/30 shadow-lg"
            >
              <BrainCircuitIcon />
              {isLoading && loadingMessage.startsWith('Analyzing') ? 'Analyzing...' : 'Dramatize Script'}
            </button>
            {dramatizedScript && (
              <div className="animate-fade-in space-y-6">
                <div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-300">2. Assign Character Voices</h2>
                    <CharacterVoiceMapper
                    characters={['Narrator', ...dramatizedScript.characters]}
                    characterVoices={characterVoices}
                    onVoiceChange={setCharacterVoices}
                    disabled={isLoading}
                    />
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-300">3. Add Ambiance</h2>
                    <div className="space-y-4 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <label htmlFor="music-select" className="text-gray-300 font-medium col-span-1">Music</label>
                            <select id="music-select" value={backgroundMusic} onChange={(e) => setBackgroundMusic(e.target.value)} disabled={isLoading} className="col-span-2 w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors">
                                {Object.entries(BACKGROUND_MUSIC_TRACKS).map(([key, { name }]) => (
                                    <option key={key} value={key}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <label htmlFor="music-volume" className="text-gray-300 font-medium col-span-1">Volume</label>
                            <div className="col-span-2 flex items-center gap-4">
                                <input id="music-volume" type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(e) => setMusicVolume(parseFloat(e.target.value))} disabled={isLoading || backgroundMusic === 'none'} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50" />
                                <span className="text-sm text-gray-400 w-10 text-right">{Math.round(musicVolume * 100)}%</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="sfx-toggle" className="text-gray-300 font-medium">Generate Sound Effects</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="sfx-toggle" checked={areSoundEffectsEnabled} onChange={(e) => setAreSoundEffectsEnabled(e.target.checked)} disabled={isLoading} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <button
                  onClick={handleProduceAudio}
                  disabled={isLoading}
                  className="w-full mt-4 flex justify-center items-center gap-2 px-6 py-3 bg-cyan-500 text-white font-bold rounded-lg hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-cyan-500/30 shadow-lg"
                >
                  <WandSparklesIcon />
                  {isLoading && !loadingMessage.startsWith('Analyzing') ? 'Producing...' : 'Produce Audio Story'}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Output */}
          <div className="flex flex-col gap-6 p-6 bg-gray-800/50 rounded-2xl border border-gray-700 shadow-lg min-h-[400px]">
             <h2 className="text-xl font-semibold text-gray-300">4. Final Production</h2>
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-purple-500"></div>
                <p className="text-lg text-gray-400">{loadingMessage}</p>
              </div>
            )}
            {error && <div className="p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">{error}</div>}
            
            {audioUrl && !isLoading && (
                <div className="animate-fade-in flex flex-col items-center justify-center h-full gap-4">
                    <PlayIcon />
                    <h3 className="text-2xl font-bold text-green-400">Your Audio Story is Ready!</h3>
                    <audio controls src={audioUrl} className="w-full rounded-full">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}

            {dramatizedScript && !isLoading && !audioUrl && (
              <div className="h-full overflow-y-auto pr-2 animate-fade-in">
                <h3 className="text-2xl font-bold mb-4 text-gray-300">Dramatized Script Preview</h3>
                {dramatizedScript.scenes.map((scene, sceneIndex) => (
                  <div key={sceneIndex} className="mb-6 p-4 border border-gray-700 rounded-lg bg-gray-900/50">
                    <h4 className="text-lg font-semibold text-purple-300 border-b border-gray-600 pb-2 mb-2">{scene.setting}</h4>
                    {scene.elements.map(renderScriptElement)}
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !dramatizedScript && !audioUrl && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <p>Your production will appear here.</p>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;