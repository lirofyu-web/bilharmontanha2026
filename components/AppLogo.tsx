import React from 'react';

const AppLogo: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-4">
      {/* Logo para tema claro */}
      <img 
        src="/logo-claro.png" 
        alt="Montanha Gestão Logo" 
        className="h-24 w-auto block dark:hidden" 
      />
      {/* Logo para tema escuro */}
      <img 
        src="/logo-escuro.png" 
        alt="Montanha Gestão Logo" 
        className="h-24 w-auto hidden dark:block"
      />
    </div>
  );
};

export default AppLogo;
