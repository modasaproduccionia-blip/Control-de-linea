# Fórmulas originales de Power Apps (versión depurada)

Se quitaron propiedades visuales (colores, tamaños, posiciones). Solo queda la lógica.

## Screen1 – Registro de producción

~~~yaml
Screens:
  Screen1:
      LoadingSpinnerColor: =RGBA(0, 51, 102, 1)
      OnVisible: =NewForm(Form1)
      - ScreenContainer1:
            - HeaderContainer1:
                  - Label2:
                        Text: ="APP - LÍNEA DE ACABADOS"
            - MainContainer1:
                  - Form1:
                      Control: Form@2.4.4
                      Variant: Classic
                        DataSource: =TB_PRODUCCION
                        DefaultMode: =FormMode.New
                        NumberOfColumns: =1
                        OnSuccess: |-
                          =Set(
                              varRegistro,
                              Form1.LastSubmit
                          );
                          Navigate(
                              SCR_ACTIVIDADES,
                              ScreenTransition.Fade
                          )
                        - FechaProduccion_DataCard1:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicDateTimeEdit
                              DataField: ="FechaProduccion"
                              Default: =ThisItem.FechaProduccion
                              Required: =false
                              Update: =DateValue(DateValue1.SelectedDate)
                              - DateValue1:
                                  Control: Classic/DatePicker@2.6.0
                                      =Parent.Width-60
                                    Text: =":"
                              - MinuteValue1:
                                  Control: Classic/DropDown@2.3.1
                        - Cliente_DataCard2:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicAllowedValuesStringEdit
                              AllowedValues: =DataSourceInfo([@TB_PRODUCCION], DataSourceInfo.AllowedValues, Cliente)
                              DataField: ="Cliente"
                              Default: =ThisItem.Cliente
                              Required: =false
                              Update: =DataCardValue11.Selected.Cliente
                              - DataCardValue11:
                                  Control: Classic/DropDown@2.3.1
                                    Default: =Parent.Default
                                    Items: =TB_CLIENTE
                        - Modelo_DataCard2:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicAllowedValuesStringEdit
                              AllowedValues: =DataSourceInfo([@TB_PRODUCCION], DataSourceInfo.AllowedValues, Modelo)
                              DataField: ="Modelo"
                              Default: =ThisItem.Modelo
                              Required: =false
                              Update: =DataCardValue13.Selected.Value
                              - DataCardValue13:
                                  Control: Classic/DropDown@2.3.1
                                    Default: =Parent.Default
                                    Items: =Distinct(TB_ESTACIONES,MODELO)
                                    OnChange: =Set(varModelo, Trim(DataCardValue13.Selected.Value))
                        - Linea_DataCard3:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicAllowedValuesStringEdit
                              AllowedValues: =DataSourceInfo([@TB_PRODUCCION], DataSourceInfo.AllowedValues, Linea)
                              DataField: ="Linea"
                              Default: =ThisItem.Linea
                              Required: =false
                              Update: =DataCardValue8.Selected.Value
                              - DataCardValue8:
                                  Control: Classic/DropDown@2.3.1
                                    Default: =Parent.Default
                                    Items: |-
                                      =Distinct(
                                          Filter(
                                              TB_ESTACIONES,
                                              MODELO = DataCardValue13.Selected.Value
                                          ),
                                          Linea
                                      )
                                    OnChange: =Set(varLinea, Trim(DataCardValue8.Selected.Value))
                        - Estacion_DataCard2:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicAllowedValuesStringEdit
                              AllowedValues: =DataSourceInfo([@TB_PRODUCCION], DataSourceInfo.AllowedValues, Estacion)
                              DataField: ="Estacion"
                              Default: =ThisItem.Estacion
                              Required: =false
                              Update: =DataCardValue6.Selected.Value
                              - DataCardValue6:
                                  Control: Classic/DropDown@2.3.1
                                    Default: =Parent.Default
                                    Items: |-
                                      =Distinct(
                                          Filter(
                                              TB_ESTACIONES,
                                              MODELO = DataCardValue13.Selected.Value
                                          ),
                                          Estacion
                                      )
                                    OnChange: =Set(varEstacion, Trim(DataCardValue6.Selected.Value))
                        - CodigoBus_DataCard1:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicTextualEdit
                              DataField: ="CodigoBus"
                              Default: =ThisItem.CodigoBus
                              Required: =false
                              Update: |-
                                =LookUp(
                                    TB_CLIENTE,
                                    Cliente = DataCardValue11.SelectedText.Value,
                                    SiglaCliente
                                ) & DataCardValue4.Text
                              - DataCardValue4:
                                  Control: Classic/TextInput@2.3.2
                                    Default: =Parent.Default
                                    DelayOutput: =true
                              - Label5:
                                    Text: |-
                                      =LookUp(
                                          TB_CLIENTE,
                                          Cliente = DataCardValue11.SelectedText.Value,
                                          SiglaCliente
                                      ) & DataCardValue4.Text
                        - HoraInicio_DataCard1:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicDateTimeEdit
                              DataField: ="HoraInicio"
                              Default: =ThisItem.HoraInicio
                              Required: =false
                              Update: |-
                                =If(
                                    !IsBlank(DateValue2.SelectedDate),
                                    DateAdd(
                                        DateTime(
                                            Year(DateValue2.SelectedDate),
                                            Month(DateValue2.SelectedDate),
                                            Day(DateValue2.SelectedDate),
                                            HourValue2.Selected.Value,
                                            MinuteValue2.Selected.Value,
                                            0
                                        ),
                                        -TimeZoneOffset(
                                            DateTime(
                                                Year(DateValue2.SelectedDate),
                                                Month(DateValue2.SelectedDate),
                                                Day(DateValue2.SelectedDate),
                                                HourValue2.Selected.Value,
                                                MinuteValue2.Selected.Value,
                                                0
                                            )
                                        ),
                                        TimeUnit.Minutes
                                    )
                                )
                              - DateValue2:
                                  Control: Classic/DatePicker@2.6.0
                              - HourValue2:
                                  Control: Classic/DropDown@2.3.1
                                    Text: =":"
                              - MinuteValue2:
                                  Control: Classic/DropDown@2.3.1
                        - HoraFin_DataCard1:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicDateTimeEdit
                              DataField: ="HoraFin"
                              Default: =ThisItem.HoraFin
                              Required: =false
                              Update: |-
                                =If(
                                    !IsBlank(DateValue3.SelectedDate),
                                    DateAdd(
                                        DateTime(
                                            Year(DateValue3.SelectedDate),
                                            Month(DateValue3.SelectedDate),
                                            Day(DateValue3.SelectedDate),
                                            HourValue3.Selected.Value,
                                            MinuteValue3.Selected.Value,
                                            0
                                        ),
                                        -TimeZoneOffset(
                                            DateTime(
                                                Year(DateValue3.SelectedDate),
                                                Month(DateValue3.SelectedDate),
                                                Day(DateValue3.SelectedDate),
                                                HourValue3.Selected.Value,
                                                MinuteValue3.Selected.Value,
                                                0
                                            )
                                        ),
                                        TimeUnit.Minutes
                                    )
                                )
                              - DateValue3:
                                  Control: Classic/DatePicker@2.6.0
                              - HourValue3:
                                  Control: Classic/DropDown@2.3.1
                                    Text: =":"
                              - MinuteValue3:
                                  Control: Classic/DropDown@2.3.1
                        - HoraEstandar_DataCard2:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicAllowedValuesStringEdit
                              AllowedValues: =DataSourceInfo([@TB_PRODUCCION], DataSourceInfo.AllowedValues, HoraEstandar)
                              DataField: ="HoraEstandar"
                              Default: =ThisItem.HoraEstandar
                              Required: =false
                              Update: =varHoraEstandar
                              Visible: =false
                              - DataCardValue12:
                                  Control: Classic/DropDown@2.3.1
                                    Default: =varHoraEstandar
                                    Items: =
                        - Responsable_DataCard1:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicTextualEdit
                              DataField: ="Responsable"
                              Default: =ThisItem.Responsable
                              Required: =false
                              Update: =DataCardValue1.Text
                              - DataCardValue1:
                                  Control: Classic/TextInput@2.3.2
                                    Default: |-
                                      =LookUp(
                                          TB_RESPONSABLE,
                                          Estacion = DataCardValue6.Selected.Value &&
                                          Linea = DataCardValue8.Selected.Value,
                                          Responsable
                                      )
                                    DelayOutput: =true
                                    DisplayMode: =DisplayMode.View
                        - DuracionLaboralReal_DataCard1:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicTextualEdit
                              DataField: ="DuracionLaboralReal"
                              Default: =ThisItem.DuracionLaboralReal
                              Required: =false
                              Update: |-
                                =Max(
                                    Value(DataCardValue3.Text),
                                    varHoraEstandar
                                )
                              Visible: =false
                              - DataCardValue3:
                                  Control: Classic/TextInput@2.3.2
                                    Default: |-
                                      =If(
                                          DateValue2.SelectedDate = DateValue3.SelectedDate,
                                          DateDiff(
                                              HoraInicio_DataCard1.Update,
                                              HoraFin_DataCard1.Update,
                                              TimeUnit.Minutes
                                          ),
                                          Weekday(DateValue2.SelectedDate, StartOfWeek.Monday) = 6
                                          &&
                                          Weekday(DateValue3.SelectedDate, StartOfWeek.Monday) = 1,
                                          DateDiff(
                                              HoraInicio_DataCard1.Update,
                                              DateAdd(
                                                  DateValue2.SelectedDate,
                                                  16 * 60,
                                                  TimeUnit.Minutes
                                              ),
                                              TimeUnit.Minutes
                                          )
                                          +
                                          DateDiff(
                                              DateAdd(
                                                  DateValue3.SelectedDate,
                                                  7 * 60,
                                                  TimeUnit.Minutes
                                              ),
                                              HoraFin_DataCard1.Update,
                                              TimeUnit.Minutes
                                          ),
                                          DateDiff(
                                              HoraInicio_DataCard1.Update,
                                              DateAdd(
                                                  DateValue2.SelectedDate,
                                                  19 * 60 + 50,
                                                  TimeUnit.Minutes
                                              ),
                                              TimeUnit.Minutes
                                          )
                                          +
                                          DateDiff(
                                              DateAdd(
                                                  DateValue3.SelectedDate,
                                                  7 * 60,
                                                  TimeUnit.Minutes
                                              ),
                                              HoraFin_DataCard1.Update,
                                              TimeUnit.Minutes
                                          )
                                      )
                                    DelayOutput: =true
                        - DuracionReal_DataCard1:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicTextualEdit
                              DataField: ="DuracionReal"
                              Default: =ThisItem.DuracionReal
                              Required: =false
                              Update: |-
                                =If(
                                    !IsBlank(HoraInicio_DataCard1.Update) &&
                                    !IsBlank(HoraFin_DataCard1.Update),
                                    DateDiff(
                                        HoraInicio_DataCard1.Update,
                                        HoraFin_DataCard1.Update,
                                        TimeUnit.Minutes
                                    ),
                                    0
                                )
                              Visible: =false
                              - DataCardValue2:
                                  Control: Classic/TextInput@2.3.2
                                    Default: =Parent.Default
                                    DelayOutput: =true
                        - Sobretiempo_DataCard1:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicTextualEdit
                              DataField: ="Sobretiempo"
                              Default: =ThisItem.Sobretiempo
                              Required: =false
                              Update: |-
                                =Max(
                                    Value(DuracionLaboralReal_DataCard1.Update) -
                                    LookUp(
                                        TB_PARAMETROS_LINEA,
                                        Linea = DataCardValue8.Selected.Value,
                                        HoraEstandar
                                    ),
                                    0
                                )
                              Visible: =false
                              - DataCardValue7:
                                  Control: Classic/TextInput@2.3.2
                                    Default: =Parent.Default
                                    DelayOutput: =true
                        - CumpleTiempo_DataCard1:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicTextualEdit
                              DataField: ="CumpleTiempo"
                              Default: =ThisItem.CumpleTiempo
                              Required: =false
                              Update: |-
                                =If(
                                    Value(Sobretiempo_DataCard1.Update) > 0,
                                    "NO",
                                    "SI"
                                )
                              Visible: =false
                              - DataCardValue9:
                                  Control: Classic/TextInput@2.3.2
                                    Default: =Parent.Default
                                    DelayOutput: =true
                        - IDProduccion_DataCard1:
                            Control: TypedDataCard@1.0.7
                            Variant: ClassicTextualEdit
                              DataField: ="IDProduccion"
                              Default: =ThisItem.IDProduccion
                              Required: =false
                              Update: =GUID()
                              Visible: =false
                              - DataCardValue10:
                                  Control: Classic/TextInput@2.3.2
                                    Default: =Parent.Default
                                    DelayOutput: =true
            - FooterContainer1:
                  - Button5:
                      Control: Classic/Button@2.2.0
                        OnSelect: |-
                          =If(
                              Confirm("¿Confirmas el registro de producción?"),
                              If(
                                  Value(HourValue2.Selected.Value) <= 0 ||
                                  Value(HourValue3.Selected.Value) <= 0,
                                  Notify(
                                      "Debe ingresar una hora de inicio y una hora de fin válidas",
                                      NotificationType.Error
                                  ),
                                  !IsMatch(
                                      Trim(DataCardValue4.Text),
                                      "^\d{3}$"
                                  ),
                                  Notify(
                                      "Debe ingresar exactamente 3 dígitos. Ejemplo: 001",
                                      NotificationType.Error
                                  ),
                                  !IsBlank(
                                      LookUp(
                                          TB_PRODUCCION,
                                          CodigoBus =
                                              LookUp(
                                                  TB_CLIENTE,
                                                  Cliente = DataCardValue11.SelectedText.Value,
                                                  SiglaCliente
                                              ) & DataCardValue4.Text
                                          &&
                                          Estacion = DataCardValue6.Selected.Value
                                      )
                                  ),
                                  Notify(
                                      "Este Código Bus ya fue registrado en esta estación.",
                                      NotificationType.Error
                                  ),
                                  Clear(colSeleccionados);
                                  Set(varModelo, Trim(DataCardValue13.Selected.Value));
                                  Set(varLinea, Trim(DataCardValue8.Selected.Value));
                                  Set(varEstacion, Trim(DataCardValue6.Selected.Value));
                                  Set(varFechaProduccion, DateValue1.SelectedDate);
                                  Set(
                                      varHoraEstandar,
                                      LookUp(
                                          TB_PARAMETROS_LINEA,
                                          Linea = varLinea,
                                          HoraEstandar
                                      )
                                  );
                                  Set(varHoraInicioReal, HoraInicio_DataCard1.Update);
                                  Set(varHoraFinReal, HoraFin_DataCard1.Update);
                                  SubmitForm(Form1)
                              ),
                              Notify(
                                  "Registro cancelado",
                                  NotificationType.Information
                              )
                          )
                        Text: ="REGISTRAR"
~~~

## SCR_ACTIVIDADES

~~~yaml
Screens:
  SCR_ACTIVIDADES:
      LoadingSpinnerColor: =RGBA(0, 51, 102, 1)
      OnVisible: =Clear(colSeleccionados)
      - ScreenContainer2:
            - MainContainer2:
                  - Gallery5:
                      Control: Gallery@2.15.0
                      Variant: BrowseLayout_Vertical_TwoTextOneImageVariant_ver5.0
                        Items: |-
                          =Filter(
                              TB_ACTIVIDADES,
                              Lower(Trim(MODELO)) = Lower(Trim(varModelo)) &&
                              Lower(Trim(Estacion)) = Lower(Trim(varEstacion)) &&
                              Lower(Trim(Linea)) = Lower(Trim(varLinea))
                          )
                        WrapCount: =true
                        - Title5:
                              OnSelect: =Select(Parent)
                              Text: =ThisItem.Actividad
                        - Subtitle5:
                              OnSelect: =Select(Parent)
                              Text: =ThisItem.Estacion
                            Control: Rectangle@2.3.0
                              OnSelect: =Select(Parent)
                        - Rectangle5:
                            Control: Rectangle@2.3.0
                              OnSelect: =Select(Parent)
                              Visible: =ThisItem.IsSelected
                        - chkRealizada:
                            Control: Classic/CheckBox@2.1.0
                              CheckboxBorderColor: =RGBA(0, 89, 178, 1)
                              CheckmarkFill: =RGBA(0, 0, 0, 1)
                              Default: |-
                                =!IsBlank(
                                    LookUp(
                                        colSeleccionados,
                                        Actividad = ThisItem.Actividad
                                    )
                                )
                              OnCheck: |-
                                =Collect(
                                    colSeleccionados,
                                    {
                                        Actividad: ThisItem.Actividad,
                                        minutos: Value(ThisItem.minutos)
                                    }
                                )
                              OnSelect: =Select(Parent)
                              OnUncheck: |-
                                =RemoveIf(
                                    colSeleccionados,
                                    Actividad = ThisItem.Actividad
                                )
                              Text: |+
                                =
                        - Label14:
                              OnSelect: =Select(Parent)
                              Text: =ThisItem.minutos
                  - Label6:
                        Text: =varModelo & " - " & varLinea & " - " & varEstacion
            - FooterContainer2:
                    =80
                  - Button5_2:
                      Control: Classic/Button@2.2.0
                        OnSelect: |-
                          =If(
                          Confirm("¿Confirmas el registro de actividades?"),
                          ForAll(
                              Gallery5.AllItems,
                              Patch(
                                  TB_CONTROL_ACTIVIDADES,
                                  Defaults(TB_CONTROL_ACTIVIDADES),
                                  {
                                      IDRegistro: GUID(),
                                      IDProduccion: varRegistro.IDProduccion,
                                      FechaProduccion: varFechaProduccion,
                                      Estacion: varRegistro.Estacion,
                                      CodigoBus: varRegistro.CodigoBus,
                                      Actividad: ThisRecord.Actividad,
                                      Realizada: If(
                                          chkRealizada.Value,
                                          "SI",
                                          "NO"
                                      )
                                  }
                              )
                          );
                          Set(
                              varAvance,
                              Round(
                                  (
                                      Sum(colSeleccionados, Value(minutos))
                                      /
                                      Sum(Gallery5.AllItems, Value(minutos))
                                  ) * 10000,
                                  1
                              )
                          );
                          Set(
                              varMinutosNoCumplidos,
                              Round(
                                  Value(varRegistro.DuracionLaboralReal) *
                                  (
                                      100 -
                                      Round(
                                          (
                                              Max(Sum(colSeleccionados, Value(minutos)), 0)
                                              /
                                              Max(Sum(Gallery5.AllItems, Value(minutos)), 1)
                                          ) * 100,
                                          1
                                      )
                                  ) / 100,
                                  0
                              )
                          );
                          Patch(
                              TB_PRODUCCION,
                              varRegistro,
                              {
                                  AvanceFinalNuevo2:
                                      Round(
                                          (
                                              Sum(colSeleccionados, Value(minutos))
                                              /
                                              Sum(Gallery5.AllItems, Value(minutos))
                                          ) * 100,
                                          1
                                      ),
                                  MinutosNoCumplidos:
                                      varMinutosNoCumplidos
                              }
                          );
                          Clear(colSeleccionados);
                          Refresh(TB_ACTIVIDADES);
                          Refresh(TB_PRODUCCION);
                          Refresh(TB_CONTROL_ACTIVIDADES);
                          ResetForm(Form1);
                          If(
                              Value(varRegistro.Sobretiempo) > 0,
                              Navigate(
                                  Screen4,
                                  ScreenTransition.Fade
                              ),
                              If(
                                  varMinutosNoCumplidos > 0,
                                  Navigate(
                                      SCR_CAUSAS,
                                      ScreenTransition.Fade
                                  ),
                                  Notify(
                                      "Registro enviado",
                                      NotificationType.Success
                                  );
                                  Navigate(
                                      Screen1,
                                      ScreenTransition.Fade
                                  )
                              )
                          ),
                          Notify(
                              "Registro cancelado",
                              NotificationType.Information
                          )
                          )
                        Text: ="REGISTRAR ACTIVIDADES"
                          =
~~~

## Screen4 – Incidencias de tiempo

~~~yaml
Screens:
  Screen4:
      LoadingSpinnerColor: =RGBA(0, 51, 102, 1)
      OnVisible: |-
        =ClearCollect(
            colIncidencias,
            {Motivo: "", Porcentaje: 0}
        )
      - ScreenContainer3:
            - HeaderContainer2:
                  - Label2_1:
                        Text: ="CONTROL DE INCIDENCIAS - TIEMPO"
            - MainContainer3:
                  - Gallery4:
                      Control: Gallery@2.15.0
                      Variant: BrowseLayout_Vertical_TwoTextOneImageVariant_ver5.0
                        Items: =colIncidencias
                        OnSelect: =Set(varItemSeleccionado, ThisItem)
                        - Subtitle4:
                              OnSelect: =Select(Parent)
                              Text: =ThisItem.Motivo
                            Control: Rectangle@2.3.0
                              OnSelect: =Select(Parent)
                        - Rectangle3:
                            Control: Rectangle@2.3.0
                              OnSelect: =Select(Parent)
                              Visible: =ThisItem.IsSelected
                        - Dropdown4:
                            Control: Classic/DropDown@2.3.1
                              Default: |+
                                =ThisItem.Motivo
                              Items: =TB_MOTIVOS.MOTIVOS
                              OnChange: |-
                                =Patch(
                                    colIncidencias,
                                    ThisItem,
                                    {Motivo: Self.Selected.MOTIVOS}
                                )
                              OnSelect: =Select(Parent)
                        - Dropdown5:
                            Control: Classic/DropDown@2.3.1
                              Default: =ThisItem.Porcentaje * 100 & "%"
                              Items: |-
                                =AddColumns(
                                    Sequence(21,0,5),
                                    Texto,
                                    Value & "%"
                                )
                              OnChange: |-
                                =Patch(
                                    colIncidencias,
                                    ThisItem,
                                    {
                                        Porcentaje: Dropdown5.Selected.Value / 100
                                    }
                                )
                              OnSelect: =Select(Parent)
                        - Label4:
                              OnSelect: =Select(Parent)
                              Text: |-
                                ="Valor de tiempo = " &
                                Int(
                                    (ThisItem.Porcentaje * Value(varRegistro.Sobretiempo)) / 60
                                ) & " h " &
                                Mod(
                                    Round(
                                        ThisItem.Porcentaje * Value(varRegistro.Sobretiempo),
                                        0
                                    ),
                                    60
                                ) & " min"
                  - Label1:
                        Text: |-
                          ="Sobretiempo total: " &
                          Round(
                              Value(varRegistro.Sobretiempo) / 60,
                              2
                          ) &
                          " hora (" &
                          Value(varRegistro.Sobretiempo) &
                          " min)"
            - FooterContainer3:
                  - Button11:
                      Control: Classic/Button@2.2.0
                        OnSelect: =Remove(colIncidencias, varItemSeleccionado)
                        Text: ="Eliminar motivo"
                  - Button11_1:
                      Control: Classic/Button@2.2.0
                        OnSelect: |-
                          =Collect(
                              colIncidencias,
                              {Motivo: "", Porcentaje: 0}
                          )
                        Text: ="Agregar motivo"
                  - Button1:
                      Control: Classic/Button@2.2.0
                        OnSelect: |-
                          =If(
                              Confirm("¿Confirmas el registro de incidencias de tiempo?"),
                              Set(
                                  varSuma,
                                  Round(
                                      Sum(
                                          colIncidencias,
                                          Porcentaje
                                      ),
                                      2
                                  )
                              );
                              Set(
                                  varMotivosRepetidos,
                                  CountRows(
                                      Distinct(
                                          Filter(
                                              colIncidencias,
                                              !IsBlank(Motivo)
                                          ),
                                          Motivo
                                      )
                                  ) <>
                                  CountRows(
                                      Filter(
                                          colIncidencias,
                                          !IsBlank(Motivo)
                                      )
                                  )
                              );
                              If(
                                  varMotivosRepetidos,
                                  Notify(
                                      "No se pueden registrar motivos repetidos",
                                      NotificationType.Error
                                  ),
                                  If(
                                      varSuma <> 1,
                                      Notify(
                                          "Los porcentajes deben sumar 100%",
                                          NotificationType.Error
                                      ),
                                      Notify(
                                          "Registro enviado",
                                          NotificationType.Success
                                      );
                                      ForAll(
                                          colIncidencias,
                                          Patch(
                                              TB_INCIDENCIAS,
                                              Defaults(TB_INCIDENCIAS),
                                              {
                                                  IDMotivo: GUID(),
                                                  IDProduccion: varRegistro.IDProduccion,
                                                  FechaProduccion: varFechaProduccion,
                                                  Estacion: varRegistro.Estacion,
                                                  CodigoBus: varRegistro.CodigoBus,
                                                  Motivo: ThisRecord.Motivo,
                                                  Porcentaje:
                                                      Round(
                                                          ThisRecord.Porcentaje * 100,
                                                          0
                                                      ),
                                                  TiempoImpacto:
                                                      Round(
                                                          ThisRecord.Porcentaje *
                                                          Value(varRegistro.Sobretiempo),
                                                          2
                                                      )
                                              }
                                          )
                                      );
                                      Refresh(TB_INCIDENCIAS);
                                      If(
                                          Value(varMinutosNoCumplidos) > 0,
                                          Navigate(
                                              SCR_CAUSAS,
                                              ScreenTransition.Fade
                                          ),
                                          Navigate(
                                              Screen1,
                                              ScreenTransition.Fade
                                          )
                                      )
                                  )
                              ),
                              Notify(
                                  "Registro cancelado",
                                  NotificationType.Information
                              )
                          )
                        Text: ="REGISTRAR"
~~~

## SCR_CAUSAS

~~~yaml
Screens:
  SCR_CAUSAS:
      LoadingSpinnerColor: =RGBA(0, 51, 102, 1)
      OnVisible: |-
        =ClearCollect(
            colCausas,
            {
                ID: 1,
                Incumplimiento: First(TB_MOTIVOS).MOTIVOS
            }
        )
      - ScreenContainer4:
            - HeaderContainer3:
                  - Label2_2:
                        Text: ="CONTROL DE INCIDENCIAS PRODUCCIÓN"
            - MainContainer4:
                    =50
                  - Label7:
                        Text: |-
                          ="Se dejaron de ejecutar " &
                          Text(varMinutosNoCumplidos) &
                          " minutos de trabajo. ¿Cuáles fueron las principales causas?"
                  - Gallery1:
                      Control: Gallery@2.15.0
                      Variant: BrowseLayout_Vertical_TwoTextOneImageVariant_ver5.0
                          =Parent.Height
                        Items: =colCausas
                        - Rectangle1:
                            Control: Rectangle@2.3.0
                              OnSelect: =Select(Parent)
                              Visible: =ThisItem.IsSelected
                            Control: Rectangle@2.3.0
                              OnSelect: =Select(Parent)
                        - Dropdown2:
                            Control: Classic/DropDown@2.3.1
                              Default: =ThisItem.Incumplimiento
                              Items: =TB_MOTIVOS
                              OnChange: |-
                                =Patch(
                                    colCausas,
                                    ThisItem,
                                    {
                                        Incumplimiento: Self.Selected.MOTIVOS
                                    }
                                )
                              OnSelect: =Select(Parent)
                        - Label17:
                              OnSelect: =Select(Parent)
                              Text: =
                        - Container1:
                                =50
                              - Icon4_1:
                                  Control: Classic/Icon@2.5.0
                                    Icon: =Icon.Add
                                    OnSelect: |-
                                      =Collect(
                                          colCausas,
                                          {
                                              ID: CountRows(colCausas) + 1,
                                              Incumplimiento: ""
                                          }
                                      )
                                      =10010
                              - Icon1_1:
                                  Control: Classic/Icon@2.5.0
                                    Icon: =Icon.Trash
                                    OnSelect: |-
                                      =If(
                                          CountRows(colCausas) > 1,
                                          Remove(
                                              colCausas,
                                              ThisItem
                                          )
                                      )
            - FooterContainer4:
                  - FooterContainer3_1:
                        - Button1_3:
                            Control: Classic/Button@2.2.0
                              OnSelect: |-
                                =If(
                                    Confirm("¿Confirmas el registro de causas de incumplimiento?"),
                                    Set(
                                        varCausasRepetidas,
                                        CountRows(
                                            Distinct(
                                                colCausas,
                                                Incumplimiento
                                            )
                                        ) <>
                                        CountRows(colCausas)
                                    );
                                    If(
                                        varCausasRepetidas,
                                        Notify(
                                            "No se pueden registrar causas repetidas",
                                            NotificationType.Error
                                        ),
                                        If(
                                            CountRows(colCausas) = 0,
                                            Notify(
                                                "No hay causas para guardar",
                                                NotificationType.Error
                                            ),
                                            With(
                                                {
                                                    total: CountRows(colCausas),
                                                    minutos: Value(varMinutosNoCumplidos)
                                                },
                                                ForAll(
                                                    Sequence(total) As s,
                                                    With(
                                                        {
                                                            item: Last(
                                                                FirstN(
                                                                    colCausas,
                                                                    s.Value
                                                                )
                                                            ),
                                                            peso:
                                                                (total - s.Value + 1)
                                                                /
                                                                Sum(
                                                                    Sequence(total),
                                                                    Value(total - Value + 1)
                                                                )
                                                        },
                                                        Patch(
                                                            TB_CAUSAS_INCUMPLIMIENTO,
                                                            Defaults(TB_CAUSAS_INCUMPLIMIENTO),
                                                            {
                                                                IDCausa: GUID(),
                                                                IDProduccion: varRegistro.IDProduccion,
                                                                CodigoBus: varRegistro.CodigoBus,
                                                                Estacion: varRegistro.Estacion,
                                                                Motivoproduccion: item.Incumplimiento,
                                                                OrdenImportancia: s.Value,
                                                                PesoAsignado:
                                                                    Round(
                                                                        peso * 100,
                                                                        0
                                                                    ),
                                                                MinutosImpacto:
                                                                    Round(
                                                                        minutos *
                                                                        If(
                                                                            Round(
                                                                                peso * 100,
                                                                                0
                                                                            ) > 1,
                                                                            Round(
                                                                                peso * 100,
                                                                                0
                                                                            ) / 100,
                                                                            peso
                                                                        ),
                                                                        0
                                                                    ),
                                                                FechaProduccion:
                                                                    varFechaProduccion
                                                            }
                                                        )
                                                    )
                                                )
                                            );
                                            Notify(
                                                "Registro guardado correctamente",
                                                NotificationType.Success
                                            );
                                            Clear(colCausas);
                                            Navigate(
                                                Screen1,
                                                ScreenTransition.Fade
                                            )
                                        )
                                    ),
                                    Notify(
                                        "Registro cancelado",
                                        NotificationType.Information
                                    )
                                )
                              Text: ="REGISTRAR"
~~~
