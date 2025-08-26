import React, { 
  useState, 
  useEffect, 
  HTMLAttributes, 
  ForwardedRef,
  forwardRef,
  useRef,
  useCallback,
  RefObject,
} from 'react';

interface DoubleBufferedIframeProps extends HTMLAttributes<HTMLIFrameElement> {
  srcDoc: string;
  scrollToBottom: boolean  
}

const DoubleBufferedIframe = forwardRef<HTMLIFrameElement, DoubleBufferedIframeProps>(
  ({ srcDoc, scrollToBottom, ...props }: DoubleBufferedIframeProps, ref: ForwardedRef<HTMLIFrameElement>) => {
    const [foregroundSrcDoc, setForegroundSrcDoc] = useState<string>(srcDoc)
    const [backgroundSrcDoc, setBackgroundSrcDoc] = useState<string>(srcDoc)
    const [isForegroundLoading, setIsForegroundLoading] = useState<boolean>(false)
    const [isBackgroundLoading, setIsBackgroundLoading] = useState<boolean>(false)
    const [loadNewDoc, setLoadNewDoc] = useState<boolean>(true)
    const [bufferedDoc, setBufferedDoc] = useState<string>("")

    const currentDoc = useRef<string>("")
    const backgroundRef = useRef<HTMLIFrameElement>(null);
    const foregroundRef = useRef<HTMLIFrameElement>(null);    

    useEffect(() => {
      if (loadNewDoc && srcDoc !== currentDoc.current) {
        setBufferedDoc(srcDoc)
        setLoadNewDoc(false)
        currentDoc.current = srcDoc
      }
    }, [srcDoc, loadNewDoc])

    useEffect(() => {
      setIsForegroundLoading(true)
      setForegroundSrcDoc(bufferedDoc)
    }, [bufferedDoc])

    useEffect(() => {
      if (!isForegroundLoading) {
        setIsBackgroundLoading(true)
        setBackgroundSrcDoc(currentDoc.current)
      }
    }, [isForegroundLoading])

    useEffect(() => {
      if (!isBackgroundLoading) {
        setLoadNewDoc(true)
      }
    }, [isBackgroundLoading])

    const scroll = (ref: RefObject<HTMLIFrameElement | null>, alignToTop: boolean) => {
      ref.current?.contentWindow?.document.body.scrollIntoView(alignToTop);
    }

    const handleBackgroundLoad = useCallback(() => {
      setTimeout(() => scroll(backgroundRef, !scrollToBottom), 0)
      setIsBackgroundLoading(false);
    }, [scrollToBottom]);

    const handleForegroundLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
      setTimeout(() => scroll(foregroundRef, !scrollToBottom), 0)
      setIsForegroundLoading(false);
      props.onLoad?.(e)
    }, [props, scrollToBottom]);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <iframe
          ref={backgroundRef}
          {...props}
          style={{
            ...props.style,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: isForegroundLoading ? "block" : "none",
          }}
          srcDoc={backgroundSrcDoc}
          onLoad={handleBackgroundLoad}
        />
        <iframe
          ref={(element) => {
            foregroundRef.current = element;
            if (typeof ref === 'function') {
              ref(element);
            } else if (ref) {
              ref.current = element;
            }
          }}
          {...props}
          style={{
            ...props.style,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: isForegroundLoading ? "none" : "block"
          }}
          srcDoc={foregroundSrcDoc}
          onLoad={handleForegroundLoad}
        />
      </div>
    );
  }
);

DoubleBufferedIframe.displayName = "DoubleBufferedIframe"

export default DoubleBufferedIframe;