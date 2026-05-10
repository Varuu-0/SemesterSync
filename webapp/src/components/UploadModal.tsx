'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, ArrowRight, Cpu, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppContext } from '@/context/AppContext'
import { cn } from '@/lib/utils'

export function UploadModal({ onUploadSuccess }: { onUploadSuccess?: (data: any) => void }) {
  const { addExtractedData } = useAppContext()
  const [files, setFiles] = useState<File[]>([])
  const [appState, setAppState] = useState<'UPLOAD' | 'PROCESSING'>('UPLOAD')
  const [isHovered, setIsHovered] = useState(false)
  const [scanStep, setScanStep] = useState(0)

  const scanSteps = [
    { title: "Reading Syllabus PDF...", desc: "Extracting raw text via OCR" },
    { title: "Analyzing Semantic Structure...", desc: "Locating assignments, midterms, and grading weights" },
    { title: "Building Temporal Graph...", desc: "Mapping dates into academic timeline" },
    { title: "Detecting Overload Clusters...", desc: "Analyzing week-by-week stress points" },
    { title: "Finalizing Plan...", desc: "Generating smart study schedules" }
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFiles(acceptedFiles);
      handleUpload(acceptedFiles);
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  })

  const handleUpload = async (filesToProcess: File[]) => {
    setAppState('PROCESSING');
    
    try {
      // Dynamic import p-limit (ESM module)
      const pLimit = (await import('p-limit')).default
      const limit = pLimit(3) // Up to 3 concurrent Gemini requests

      // Scanning animation timer
      const timer = setInterval(() => {
        setScanStep((prev) => {
          if (prev >= scanSteps.length - 1) {
            clearInterval(timer);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);

      // Process ALL files concurrently with a pool limit.
      // Fast files complete immediately — no batch barriers.
      const allResults = await Promise.all(
        filesToProcess.map(file =>
          limit(async () => {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            })

            if (!response.ok) {
              console.error(`Failed to process ${file.name}`);
              return null;
            }

            const result = await response.json()
            if (result.data) {
              // Add to state IMMEDIATELY as each file finishes
              addExtractedData(result.data)
              return result.data
            }
            return null
          })
        )
      )

      // Ensure animation finishes
      clearInterval(timer);
      setScanStep(scanSteps.length);

      setTimeout(() => {
        if (onUploadSuccess) {
          onUploadSuccess(allResults.filter(Boolean))
        }
      }, 800);

    } catch (err: any) {
      console.error(err);
      setAppState('UPLOAD');
    }
  }

  return (
    <div className="w-full max-w-4xl h-full max-h-[80vh] flex flex-col items-center justify-center relative">
      <AnimatePresence mode="wait">
        
        {appState === 'UPLOAD' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.4 }}
            className="w-full flex flex-col items-center justify-center p-8 lg:p-12"
          >
            <div className="w-full text-center space-y-4 mb-10">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white text-sm font-medium mb-4"
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                AI-Powered Academic Planning
              </motion.div>
              <motion.h1 
                className="text-4xl lg:text-5xl font-display font-semibold tracking-tight text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Turn syllabi chaos into a<br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  genius semester plan.
                </span>
              </motion.h1>
              <motion.p 
                className="text-white/40 text-lg max-w-xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                Upload your PDFs. We'll instantly extract assignments, map out your calendar, and spot those deadly mid-semester crunches.
              </motion.p>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full max-w-2xl"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div
                {...getRootProps()}
                className={cn(
                  "w-full rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center p-16 transition-all duration-300 relative overflow-hidden group bg-white/5 backdrop-blur-3xl cursor-pointer",
                  isDragActive || isHovered ? "border-blue-500/50 shadow-xl shadow-blue-500/10 bg-white/10" : "border-white/10"
                )}
              >
                <input {...getInputProps()} />
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 opacity-0 transition-opacity duration-500",
                  (isDragActive || isHovered) && "opacity-100"
                )} />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl bg-white/10 text-blue-400 flex items-center justify-center mb-6 shadow-sm group-hover:-translate-y-2 transition-transform duration-300">
                    <UploadCloud size={40} />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    {isDragActive ? 'Drop your syllabi here' : 'Drag & drop your syllabi'}
                  </h3>
                  <p className="text-white/40 mb-8">PDF files supported</p>
                  
                  <div className="flex items-center gap-4 text-sm font-medium text-black bg-white px-6 py-3 rounded-full hover:bg-white/90 transition-colors">
                    <FileText size={16} className="text-black" />
                    Select files manually
                    <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {appState === 'PROCESSING' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="w-full flex flex-col items-center justify-center p-8"
          >
            <div className="max-w-md w-full">
              
              {/* Animated Scanner Graphic */}
              <div className="relative w-48 h-64 mx-auto mb-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-lg overflow-hidden flex flex-col items-center justify-center">
                <FileText size={48} className="text-white/20" />
                
                {/* Laser scanning line */}
                <motion.div 
                  className="absolute left-0 right-0 h-1 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)]"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
                
                {/* Faux Document lines */}
                <div className="absolute inset-x-6 top-8 bottom-8 flex flex-col gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-2 bg-white/10 rounded w-full" />
                  ))}
                </div>

                {/* Glowing AI brain icon overlay */}
                <motion.div 
                  className="absolute bottom-4 right-4 bg-gradient-to-tr from-purple-500 to-blue-500 text-white p-2 rounded-full shadow-lg shadow-purple-500/20"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Cpu size={20} />
                </motion.div>
              </div>

              {/* Progress List */}
              <div className="space-y-4">
                {scanSteps.map((s, index) => {
                  const isCompleted = index < scanStep;
                  const isActive = index === scanStep;
                  const isWaiting = index > scanStep;

                  return (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: isWaiting ? 0.4 : 1, x: 0 }}
                      className={`flex items-start gap-4 p-3 rounded-2xl transition-colors ${isActive ? 'bg-white/10 border border-white/20 backdrop-blur-md' : 'border border-transparent'}`}
                    >
                      <div className="mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="text-green-400" size={20} />
                        ) : isActive ? (
                          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-white/20" />
                        )}
                      </div>
                      <div>
                        <h4 className={`font-medium ${isActive ? 'text-white' : 'text-white/60'}`}>
                          {s.title}
                        </h4>
                        <p className="text-sm text-white/40 mt-0.5">{s.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
