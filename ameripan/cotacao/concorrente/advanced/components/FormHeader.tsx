
import React from 'react';
import { NavLink } from 'react-router-dom';

const FormHeader: React.FC = () => {
    const linkClasses = "px-4 py-2 rounded-md text-sm font-medium transition-colors";
    const activeLinkClasses = "bg-primary text-white";
    const inactiveLinkClasses = "text-gray-600 hover:bg-blue-100 hover:text-primary";

    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <nav className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center">
                <div className="text-xl font-bold text-primary">
                    <i className="fas fa-chart-line mr-2"></i>
                    Inteligência Comercial
                </div>
                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                    <NavLink to="/" className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                        <i className="fas fa-dollar-sign mr-1"></i> Cotação
                    </NavLink>
                    <NavLink to="/sugestao-produto" className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                        <i className="fas fa-lightbulb mr-1"></i> Sugerir Produto
                    </NavLink>
                    <NavLink to="/sugestao-ideia" className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                        <i className="fas fa-brain mr-1"></i> Enviar Ideia
                    </NavLink>
                    <NavLink to="/dashboard" className={`${linkClasses} ${inactiveLinkClasses} bg-green-100 text-green-800 hover:bg-green-200`}>
                       <i className="fas fa-lock mr-1"></i> Acessar Painel
                    </NavLink>
                     <a href="#/tutorial-formularios" target="_blank" className={`${linkClasses} ${inactiveLinkClasses}`}>
                        <i className="fas fa-question-circle mr-1"></i> Ajuda
                    </a>
                </div>
            </nav>
        </header>
    );
};

export default FormHeader;
