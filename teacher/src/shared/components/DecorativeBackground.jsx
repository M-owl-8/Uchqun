/* eslint-disable no-case-declarations */
import React from 'react';
import './DecorativeBackground.css';

const DecorativeBackground = () => {
  // Och ko'k rang - yanada ko'rinadigan
  const lightBlue = '#E3F2FD';
  const whiteBlue = '#FFFFFF';

  // Dekorativ elementlar - ko'proq va kattaroq iconchalar
  const decorativeElements = [
    // O'yinchoq ayiqchalar (ko'proq va kattaroq)
    { type: 'bear', top: 10, left: 20, size: 50, rotation: -15 },
    { type: 'bear', top: 150, left: 80, size: 45, rotation: 20 },
    { type: 'bear', top: 300, left: 15, size: 55, rotation: -10 },
    { type: 'bear', top: 500, left: 70, size: 48, rotation: 15 },
    { type: 'bear', top: 700, left: 25, size: 52, rotation: -20 },
    { type: 'bear', top: 250, left: 45, size: 46, rotation: 35 },
    { type: 'bear', top: 450, left: 85, size: 44, rotation: -25 },
    { type: 'bear', top: 650, left: 12, size: 50, rotation: 18 },
    { type: 'bear', top: 850, left: 60, size: 47, rotation: -30 },
    { type: 'bear', top: 950, left: 35, size: 49, rotation: 22 },
    { type: 'bear', top: 1100, left: 75, size: 51, rotation: -18 },
    { type: 'bear', top: 1300, left: 18, size: 48, rotation: 40 },
    { type: 'bear', top: 100, left: 55, size: 43, rotation: -12 },
    { type: 'bear', top: 350, left: 30, size: 52, rotation: 28 },
    { type: 'bear', top: 550, left: 65, size: 45, rotation: -35 },
    { type: 'bear', top: 750, left: 8, size: 50, rotation: 15 },
    { type: 'bear', top: 900, left: 75, size: 46, rotation: -22 },
    { type: 'bear', top: 1050, left: 40, size: 49, rotation: 30 },
    { type: 'bear', top: 1200, left: 15, size: 47, rotation: -28 },
    { type: 'bear', top: 1400, left: 60, size: 51, rotation: 25 },
    { type: 'bear', top: 200, left: 5, size: 44, rotation: 12 },
    { type: 'bear', top: 400, left: 95, size: 53, rotation: -40 },
    { type: 'bear', top: 600, left: 50, size: 46, rotation: 25 },
    { type: 'bear', top: 800, left: 25, size: 48, rotation: -15 },
    { type: 'bear', top: 1000, left: 70, size: 45, rotation: 33 },
    { type: 'bear', top: 1150, left: 10, size: 50, rotation: -25 },
    { type: 'bear', top: 1250, left: 65, size: 47, rotation: 20 },
    { type: 'bear', top: 1450, left: 35, size: 49, rotation: -30 },
    { type: 'bear', top: 50, left: 40, size: 51, rotation: 18 },
    { type: 'bear', top: 175, left: 88, size: 43, rotation: -22 },
    { type: 'bear', top: 375, left: 15, size: 54, rotation: 28 },
    { type: 'bear', top: 575, left: 80, size: 46, rotation: -18 },
    { type: 'bear', top: 775, left: 42, size: 49, rotation: 35 },
    { type: 'bear', top: 925, left: 8, size: 47, rotation: -28 },
    { type: 'bear', top: 1075, left: 58, size: 52, rotation: 22 },
    { type: 'bear', top: 1175, left: 28, size: 45, rotation: -35 },
    { type: 'bear', top: 1375, left: 75, size: 48, rotation: 30 },
    { type: 'bear', top: 1475, left: 20, size: 50, rotation: -20 },
    
    // O'yinchoq mashinalar (ko'proq va kattaroq)
    { type: 'car', top: 50, left: 60, size: 60, rotation: 25 },
    { type: 'car', top: 200, left: 10, size: 55, rotation: -20 },
    { type: 'car', top: 400, left: 50, size: 58, rotation: 10 },
    { type: 'car', top: 600, left: 25, size: 52, rotation: -15 },
    { type: 'car', top: 800, left: 65, size: 56, rotation: 20 },
    { type: 'car', top: 100, left: 30, size: 53, rotation: -35 },
    { type: 'car', top: 350, left: 75, size: 57, rotation: 28 },
    { type: 'car', top: 550, left: 15, size: 54, rotation: -22 },
    { type: 'car', top: 750, left: 55, size: 59, rotation: 15 },
    { type: 'car', top: 900, left: 40, size: 51, rotation: -28 },
    { type: 'car', top: 1050, left: 70, size: 55, rotation: 32 },
    { type: 'car', top: 1200, left: 22, size: 56, rotation: -25 },
    { type: 'car', top: 1350, left: 65, size: 53, rotation: 20 },
    { type: 'car', top: 150, left: 85, size: 57, rotation: -18 },
    { type: 'car', top: 300, left: 5, size: 54, rotation: 22 },
    { type: 'car', top: 500, left: 90, size: 58, rotation: -30 },
    { type: 'car', top: 650, left: 35, size: 55, rotation: 18 },
    { type: 'car', top: 850, left: 12, size: 56, rotation: -24 },
    { type: 'car', top: 1000, left: 48, size: 57, rotation: 26 },
    { type: 'car', top: 1150, left: 80, size: 54, rotation: -20 },
    { type: 'car', top: 1300, left: 28, size: 58, rotation: 32 },
    
    // Yulduzchalar (ko'proq va kattaroq)
    { type: 'star', top: 30, left: 45, size: 35, rotation: 0 },
    { type: 'star', top: 120, left: 30, size: 33, rotation: 45 },
    { type: 'star', top: 250, left: 75, size: 37, rotation: -45 },
    { type: 'star', top: 350, left: 20, size: 34, rotation: 30 },
    { type: 'star', top: 450, left: 65, size: 36, rotation: -30 },
    { type: 'star', top: 550, left: 40, size: 32, rotation: 60 },
    { type: 'star', top: 650, left: 55, size: 35, rotation: -60 },
    { type: 'star', top: 750, left: 35, size: 33, rotation: 45 },
    { type: 'star', top: 80, left: 65, size: 31, rotation: 25 },
    { type: 'star', top: 180, left: 15, size: 34, rotation: -35 },
    { type: 'star', top: 320, left: 50, size: 36, rotation: 50 },
    { type: 'star', top: 420, left: 25, size: 32, rotation: -40 },
    { type: 'star', top: 520, left: 80, size: 35, rotation: 55 },
    { type: 'star', top: 620, left: 10, size: 33, rotation: -25 },
    { type: 'star', top: 720, left: 60, size: 34, rotation: 40 },
    { type: 'star', top: 820, left: 35, size: 31, rotation: -50 },
    { type: 'star', top: 920, left: 70, size: 36, rotation: 30 },
    { type: 'star', top: 1020, left: 20, size: 32, rotation: -45 },
    { type: 'star', top: 1120, left: 55, size: 35, rotation: 35 },
    { type: 'star', top: 1220, left: 40, size: 33, rotation: -30 },
    { type: 'star', top: 1320, left: 75, size: 34, rotation: 42 },
    { type: 'star', top: 140, left: 5, size: 36, rotation: -20 },
    { type: 'star', top: 270, left: 90, size: 32, rotation: 48 },
    { type: 'star', top: 380, left: 12, size: 35, rotation: -38 },
    { type: 'star', top: 480, left: 58, size: 33, rotation: 52 },
    { type: 'star', top: 580, left: 25, size: 37, rotation: -28 },
    { type: 'star', top: 680, left: 72, size: 34, rotation: 44 },
    { type: 'star', top: 780, left: 8, size: 32, rotation: -32 },
    { type: 'star', top: 880, left: 50, size: 35, rotation: 38 },
    { type: 'star', top: 980, left: 85, size: 33, rotation: -42 },
    { type: 'star', top: 1080, left: 18, size: 36, rotation: 46 },
    { type: 'star', top: 60, left: 25, size: 34, rotation: 15 },
    { type: 'star', top: 160, left: 70, size: 32, rotation: -25 },
    { type: 'star', top: 290, left: 8, size: 35, rotation: 40 },
    { type: 'star', top: 390, left: 55, size: 33, rotation: -30 },
    { type: 'star', top: 490, left: 35, size: 36, rotation: 50 },
    { type: 'star', top: 590, left: 75, size: 31, rotation: -35 },
    { type: 'star', top: 690, left: 18, size: 34, rotation: 28 },
    { type: 'star', top: 790, left: 62, size: 32, rotation: -40 },
    { type: 'star', top: 890, left: 28, size: 35, rotation: 45 },
    { type: 'star', top: 990, left: 78, size: 33, rotation: -22 },
    { type: 'star', top: 1090, left: 42, size: 36, rotation: 38 },
    { type: 'star', top: 1190, left: 88, size: 31, rotation: -48 },
    { type: 'star', top: 1290, left: 15, size: 34, rotation: 32 },
    { type: 'star', top: 1390, left: 68, size: 35, rotation: -28 },
    { type: 'star', top: 1490, left: 38, size: 33, rotation: 42 },
    { type: 'star', top: 110, left: 52, size: 32, rotation: -18 },
    { type: 'star', top: 210, left: 22, size: 35, rotation: 33 },
    { type: 'star', top: 310, left: 68, size: 33, rotation: -27 },
    { type: 'star', top: 410, left: 42, size: 36, rotation: 47 },
    { type: 'star', top: 510, left: 88, size: 31, rotation: -33 },
    { type: 'star', top: 610, left: 28, size: 34, rotation: 29 },
    { type: 'star', top: 710, left: 72, size: 32, rotation: -41 },
    { type: 'star', top: 810, left: 12, size: 35, rotation: 36 },
    { type: 'star', top: 910, left: 58, size: 33, rotation: -24 },
    { type: 'star', top: 1010, left: 82, size: 36, rotation: 43 },
    { type: 'star', top: 1110, left: 32, size: 31, rotation: -31 },
    { type: 'star', top: 1210, left: 65, size: 34, rotation: 39 },
    { type: 'star', top: 1310, left: 8, size: 35, rotation: -26 },
    { type: 'star', top: 1410, left: 48, size: 33, rotation: 44 },
    { type: 'star', top: 1510, left: 85, size: 32, rotation: -37 },
    
    // Ipli pufakchalar (ko'proq va kattaroq)
    { type: 'bubble', top: 80, left: 35, size: 45, rotation: 0 },
    { type: 'bubble', top: 180, left: 55, size: 50, rotation: 0 },
    { type: 'bubble', top: 280, left: 25, size: 42, rotation: 0 },
    { type: 'bubble', top: 380, left: 60, size: 48, rotation: 0 },
    { type: 'bubble', top: 480, left: 15, size: 44, rotation: 0 },
    { type: 'bubble', top: 580, left: 50, size: 46, rotation: 0 },
    { type: 'bubble', top: 680, left: 40, size: 47, rotation: 0 },
    { type: 'bubble', top: 780, left: 30, size: 43, rotation: 0 },
    { type: 'bubble', top: 120, left: 70, size: 49, rotation: 0 },
    { type: 'bubble', top: 220, left: 12, size: 41, rotation: 0 },
    { type: 'bubble', top: 320, left: 45, size: 46, rotation: 0 },
    { type: 'bubble', top: 420, left: 80, size: 45, rotation: 0 },
    { type: 'bubble', top: 520, left: 28, size: 43, rotation: 0 },
    { type: 'bubble', top: 620, left: 65, size: 48, rotation: 0 },
    { type: 'bubble', top: 720, left: 18, size: 44, rotation: 0 },
    { type: 'bubble', top: 820, left: 52, size: 47, rotation: 0 },
    { type: 'bubble', top: 920, left: 38, size: 42, rotation: 0 },
    { type: 'bubble', top: 1020, left: 72, size: 46, rotation: 0 },
    { type: 'bubble', top: 1120, left: 15, size: 45, rotation: 0 },
    { type: 'bubble', top: 1220, left: 58, size: 44, rotation: 0 },
    { type: 'bubble', top: 1320, left: 33, size: 48, rotation: 0 },
    { type: 'bubble', top: 160, left: 88, size: 43, rotation: 0 },
    { type: 'bubble', top: 260, left: 5, size: 47, rotation: 0 },
    { type: 'bubble', top: 360, left: 38, size: 45, rotation: 0 },
    { type: 'bubble', top: 460, left: 75, size: 46, rotation: 0 },
    { type: 'bubble', top: 560, left: 22, size: 44, rotation: 0 },
    { type: 'bubble', top: 660, left: 62, size: 48, rotation: 0 },
    { type: 'bubble', top: 760, left: 8, size: 42, rotation: 0 },
    { type: 'bubble', top: 860, left: 48, size: 47, rotation: 0 },
    { type: 'bubble', top: 960, left: 82, size: 45, rotation: 0 },
    { type: 'bubble', top: 1060, left: 28, size: 46, rotation: 0 },
  ];

  const renderElement = (element, index) => {
    const style = {
      position: 'absolute',
      top: `${element.top}px`,
      left: `${element.left}%`,
      width: `${element.size}px`,
      height: `${element.size}px`,
      opacity: element.type === 'star' ? 0.8 : (element.type === 'bear' ? 0.7 : 0.5),
      transform: `rotate(${element.rotation}deg)`,
      pointerEvents: 'none',
      zIndex: 1,
    };

    switch (element.type) {
      case 'bear':
        const bearHeadSize = element.size * 0.6;
        const bearBodySize = element.size * 0.55;
        return (
          <div key={`bear-${index}`} style={style} className="decorative-bear">
            <div className="bear-head" style={{ 
              backgroundColor: whiteBlue,
              width: `${bearHeadSize}px`,
              height: `${bearHeadSize}px`,
              borderRadius: `${bearHeadSize / 2}px`,
              top: 0,
              left: `${element.size * 0.15}px`,
              border: `2px solid ${lightBlue}`
            }}></div>
            <div className="bear-body" style={{ 
              backgroundColor: whiteBlue,
              width: `${bearBodySize}px`,
              height: `${bearBodySize}px`,
              borderRadius: `${bearBodySize / 2}px`,
              top: `${element.size * 0.5}px`,
              left: `${element.size * 0.18}px`,
              border: `2px solid ${lightBlue}`
            }}></div>
          </div>
        );
      
      case 'car':
        const carBodyWidth = element.size * 0.7;
        const carBodyHeight = element.size * 0.35;
        const carWindowWidth = element.size * 0.28;
        const carWindowHeight = element.size * 0.2;
        const carWheelSize = element.size * 0.2;
        return (
          <div key={`car-${index}`} style={style} className="decorative-car">
            <div className="car-body" style={{ 
              backgroundColor: lightBlue,
              width: `${carBodyWidth}px`,
              height: `${carBodyHeight}px`,
              borderRadius: `${element.size * 0.08}px`,
              top: `${element.size * 0.25}px`,
              left: `${element.size * 0.12}px`
            }}></div>
            <div className="car-window" style={{ 
              backgroundColor: lightBlue, 
              opacity: 0.5,
              width: `${carWindowWidth}px`,
              height: `${carWindowHeight}px`,
              borderRadius: `${element.size * 0.05}px`,
              top: `${element.size * 0.3}px`,
              left: `${element.size * 0.35}px`
            }}></div>
            <div className="car-wheel" style={{ 
              backgroundColor: lightBlue,
              width: `${carWheelSize}px`,
              height: `${carWheelSize}px`,
              borderRadius: `${carWheelSize / 2}px`,
              top: `${element.size * 0.5}px`,
              left: `${element.size * 0.2}px`
            }}></div>
            <div className="car-wheel car-wheel-right" style={{ 
              backgroundColor: lightBlue,
              width: `${carWheelSize}px`,
              height: `${carWheelSize}px`,
              borderRadius: `${carWheelSize / 2}px`,
              top: `${element.size * 0.5}px`,
              left: `${element.size * 0.6}px`
            }}></div>
          </div>
        );
      
      case 'star':
        const starSize = element.size;
        const starCenter = starSize / 2;
        return (
          <div key={`star-${index}`} style={style} className="decorative-star">
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: starSize,
              height: starSize,
              transform: 'translate(-50%, -50%)',
              clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
              backgroundColor: lightBlue,
              border: `1px solid ${whiteBlue}`
            }}></div>
          </div>
        );
      
      case 'bubble':
        const bubbleStringHeight = element.size * 0.3;
        return (
          <div key={`bubble-${index}`} style={style} className="decorative-bubble">
            <div 
              className="bubble-circle" 
              style={{ 
                backgroundColor: lightBlue, 
                width: `${element.size}px`, 
                height: `${element.size}px`,
                borderRadius: `${element.size / 2}px`
              }}
            ></div>
            <div 
              className="bubble-string" 
              style={{ 
                backgroundColor: lightBlue, 
                opacity: 0.4,
                width: `${element.size * 0.04}px`,
                height: `${bubbleStringHeight}px`,
                top: `-${bubbleStringHeight}px`,
                left: '50%',
                transform: 'translateX(-50%)'
              }}
            ></div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="decorative-background">
      {decorativeElements.map((element, index) => renderElement(element, index))}
    </div>
  );
};

export default DecorativeBackground;
