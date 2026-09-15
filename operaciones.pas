program OperacionesAritmeticas;

var
  numero1, numero2: Real;

begin
  WriteLn('OPERACIONES ARITMETICAS');
  Write('Ingresa el primer numero: ');
  ReadLn(numero1);
  Write('Ingresa el segundo numero: ');
  ReadLn(numero2);

  WriteLn;
  WriteLn('Resultados:');
  WriteLn('Suma: ', numero1 + numero2:0:2);
  WriteLn('Resta: ', numero1 - numero2:0:2);
  WriteLn('Multiplicacion: ', numero1 * numero2:0:2);

  if numero2 = 0 then
    WriteLn('Division: no se puede dividir entre cero.')
  else
    WriteLn('Division: ', numero1 / numero2:0:2);

  ReadLn;
end.
